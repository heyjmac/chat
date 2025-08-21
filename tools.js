import { GoogleGenAI } from '@google/genai';
import path from 'path';
import PDFDocument from 'pdfkit';
import fs from 'fs';

// ---------- Local functions ----------
function informUser(sendSubChunks, message) {
  return { message }; 
}

function generateReportPDF(sendSubChunks, reportData) {
  return new Promise((resolve) => {
    const fileName = `report_${Date.now()}.pdf`;
    sendSubChunks(fileName, 'fileName');
    sendSubChunks(`/downloads/${fileName}`, 'publicUrl');
    const filePath = path.join(process.cwd(), 'downloads', fileName);
    sendSubChunks(filePath, 'filePath');
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(18).text('Generated Report', { align: 'center' });
    doc.moveDown();
    Object.entries(reportData).forEach(([key, value]) => {
      doc.fontSize(12).text(`${key}: ${value}`);
    });
    doc.end();
    stream.on('finish', () => {
      resolve()
    });
  });
}

async function draftEmail(sendSubChunks, to, subject, body) { 
  sendSubChunks('loading', 'status');
  sendSubChunks(to, 'to');
  sendSubChunks(subject, 'subject');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContentStream({
    model: 'gemini-2.0-flash',
    contents: `Make a long version of this text, it should be at least 2 paragraphs:\n\n${body}`,
  });

  let full = '';
  for await (const chunk of response) {
    const part = chunk.text;
    if (part) {
      sendSubChunks(part, 'body');
      full += part;
    }
  }

  return { status: 'draft', to, subject, body: full }; 
}

async function generateTextFile(sendSubChunks, content) {
  sendSubChunks('loading', 'status');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContentStream({
    model: 'gemini-2.0-flash',
    contents: `Make a long version of this text, it should be at least 2 paragraphs:\n\n${content}`,
  });

  let full = '';
  for await (const chunk of response) {
    const part = chunk.text;
    if (part) {
      sendSubChunks(part, 'content');
      full += part;
    }
  }

  sendSubChunks('done', 'status');
  return { content: full };
}

// ---------- Tools ----------
export const tools = [
  {
    name: 'generateReportPDF',
    description: 'Generates a PDF file based on the provided report data, including formatting and layout.',
    parameters: {
      type: 'object',
      properties: {
        reportData: {
          type: 'object',
          description: 'An object containing all the necessary data to be included in the PDF report, such as titles, tables, charts, and text content.'
        }
      },
      required: ['reportData']
    }
  },
  {
    name: 'draftEmail',
    description: 'Creates an email draft ready for sending, including recipient, subject, and message body.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'The email address of the recipient.'
        },
        subject: {
          type: 'string',
          description: 'The subject line of the email.'
        },
        body: {
          type: 'string',
          description: 'The main content of the email body, supporting plain text or HTML.'
        }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'generateTextFile',
    description: 'Generates a Microsoft Word-compatible based on the provided text content.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The full text or formatted content to be inserted into a Word document.'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'informUser',
    description: 'Sends an informational message to the user without executing any action.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message text to display to the user, explaining the next step or providing context.'
        }
      },
      required: ['message']
    }
  }
];

export const toolExecutors = {
    informUser: (sendSubChunks, { message }) => informUser(sendSubChunks, message),
    generateReportPDF: (sendSubChunks, { reportData }) => generateReportPDF(sendSubChunks, reportData),
    generateTextFile: async (sendSubChunks, { content }) => await generateTextFile(sendSubChunks, content),
    draftEmail: (sendSubChunks, { to, subject, body }) => draftEmail(sendSubChunks, to, subject, body),
};
