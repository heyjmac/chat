import React from "react";
import { TypingIndicator } from "./Typing";

export function InformUser({ output }) {
  return <p className="mb-4">{output?.message}</p>
}

export function GenerateTextFile({ output }) {
  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden hover:shadow-md">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-500 text-sm">description</span>
          <h3 className="text-sm font-medium">Documento Word</h3>
        </div>
        <div className="flex gap-2">
          <button
            className="copy-btn text-blue-600 text-xs hover:text-blue-700"
            onClick={() => navigator.clipboard.writeText(output?.content)}
          >
            Copy
          </button>
        </div>
      </div>
      <div className="p-3 bg-white">
        <pre className="text-sm whitespace-pre-wrap">{output?.content}</pre>
        {output?.status === 'loading' && <TypingIndicator />}
      </div>
    </div>
  )
}

export function DraftEmail({ output }) {
  const handleSend = () => {
    const to = encodeURIComponent(output?.to)
    const subject = encodeURIComponent(output?.subject)
    const body = encodeURIComponent(output?.body)
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden hover:shadow-md">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-gray-500 text-sm">email</span>
          <h3 className="text-sm font-medium">Email to {output?.to}</h3>
        </div>
        <div className="flex gap-2">
          <button
            className="copy-btn text-blue-600 text-xs hover:text-blue-700"
            onClick={() => navigator.clipboard.writeText(`${output?.subject}\n\n${output?.body}`)}
          >
            Copy
          </button>
          <button className="send-btn text-blue-600 text-xs hover:text-blue-700" onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
      <div className="p-3 bg-white email-body">
        <p className="text-sm font-medium mb-1">Subject: {output?.subject}</p>
        <p className="text-sm mb-3">To: {output?.to}</p>
        <p className="text-sm mb-2 whitespace-pre-wrap">{output?.body}</p>
        {output?.status === 'loading' && <TypingIndicator />}
      </div>
    </div>
  )
}

export function GenerateReportPDF({ output }) {
  return (
    <div className="border border-gray-200 rounded-lg mb-4 flex items-center p-3 hover:bg-gray-50 transition-all group">
      <span className="material-symbols-outlined text-red-500 mr-3">picture_as_pdf</span>
      <div className="flex-1">
        <h3 className="text-sm font-medium">{output?.fileName}</h3>
        <p className="text-xs text-gray-500">Generated PDF report</p>
      </div>
      <a href={output?.publicUrl} download className="text-gray-400 hover:text-blue-600">
        <span className="material-symbols-outlined">download</span>
      </a>
    </div>
  )
}
