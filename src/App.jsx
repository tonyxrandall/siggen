import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [signature, setSignature] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const canvasRef = useRef(null);
  const signatureRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => setPdfFile(reader.result);
      reader.readAsArrayBuffer(file);
    }
  };

  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const saveSignature = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignature(dataUrl);
    setDrawMode(false);
  };

  const addSignatureToPdf = async () => {
    if (!pdfFile || !signature) return alert("Upload a PDF and draw a signature first.");
    const pdfDoc = await PDFDocument.load(pdfFile);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const pngImage = await pdfDoc.embedPng(signature);
    const { width, height } = firstPage.getSize();
    const sigWidth = 150;
    const sigHeight = 75;
    firstPage.drawImage(pngImage, {
      x: width / 2 - sigWidth / 2,
      y: height / 4,
      width: sigWidth,
      height: sigHeight,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "signed.pdf";
    a.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">PDF Signature App</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="mb-4"
      />

      {pdfFile && (
        <div className="border rounded p-4 bg-white shadow mb-4">
          <Document file={pdfFile} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
            <Page pageNumber={pageNumber} width={400} />
          </Document>
          <p className="text-center mt-2">
            Page {pageNumber} of {numPages}
          </p>
        </div>
      )}

      {drawMode ? (
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={300}
            height={150}
            className="border bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
          ></canvas>
          <button
            className="bg-green-600 text-white px-4 py-2 mt-3 rounded"
            onClick={saveSignature}
          >
            Save Signature
          </button>
        </div>
      ) : (
        <>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded mb-3"
            onClick={() => setDrawMode(true)}
          >
            Draw Signature
          </button>
          {signature && (
            <div ref={signatureRef} className="mb-4">
              <p className="font-semibold mb-1 text-center">Your Signature:</p>
              <img src={signature} alt="signature" className="border bg-white mx-auto" />
            </div>
          )}
        </>
      )}

      <button
        className="bg-purple-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        onClick={addSignatureToPdf}
        disabled={!pdfFile || !signature}
      >
        Add Signature to PDF & Download
      </button>
    </div>
  );
}
