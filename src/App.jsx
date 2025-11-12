import React, { useState, useRef, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`;

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [signatures, setSignatures] = useState([]); // multiple signatures
  const [numPages, setNumPages] = useState(null);
  const [typedSig, setTypedSig] = useState("");
  const [activeTool, setActiveTool] = useState("draw"); // draw | type | upload
  const [drawMode, setDrawMode] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragging, setDragging] = useState(null);

  // handle pdf upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => setPdfFile(reader.result);
      reader.readAsArrayBuffer(file);
    }
  };

  // drawing signature
  const startDrawing = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
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

  const stopDrawing = () => setIsDrawing(false);

  const saveDrawnSignature = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setSignatures((prev) => [
      ...prev,
      { id: Date.now(), img: dataUrl, x: 100, y: 100, page: 1, width: 150, height: 75 },
    ]);
    setDrawMode(false);
  };

  const saveTypedSignature = () => {
    if (!typedSig) return;
    // create a small canvas to convert text to image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 300;
    canvas.height = 100;
    ctx.font = "40px Great Vibes, cursive";
    ctx.fillStyle = "black";
    ctx.fillText(typedSig, 10, 60);
    const dataUrl = canvas.toDataURL("image/png");
    setSignatures((prev) => [
      ...prev,
      { id: Date.now(), img: dataUrl, x: 100, y: 100, page: 1, width: 150, height: 75 },
    ]);
    setTypedSig("");
  };

  const handleUploadSignature = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setSignatures((prev) => [
        ...prev,
        { id: Date.now(), img: reader.result, x: 100, y: 100, page: 1, width: 150, height: 75 },
      ]);
    reader.readAsDataURL(file);
  };

  const handlePdfClick = (e, pageNumber) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left - 75;
    const y = e.clientY - rect.top - 35;
    // place most recent signature
    if (signatures.length > 0) {
      setSignatures((prev) => {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, x, y, page: pageNumber }];
      });
    }
  };

  const handleMouseDown = (id) => setDragging(id);
  const handleMouseUp = () => setDragging(null);
  const handleMouseMove = (e) => {
    if (!dragging) return;
    const rect = e.target.closest(".pdf-page").getBoundingClientRect();
    const x = e.clientX - rect.left - 75;
    const y = e.clientY - rect.top - 35;
    setSignatures((prev) =>
      prev.map((sig) => (sig.id === dragging ? { ...sig, x, y } : sig))
    );
  };

  const addSignatureToPdf = async () => {
    if (!pdfFile || signatures.length === 0)
      return alert("Upload a PDF and add at least one signature.");
    const pdfDoc = await PDFDocument.load(pdfFile);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      const img = await pdfDoc.embedPng(sig.img);
      const page = pages[sig.page - 1] || pages[0];
      const { height } = page.getSize();
      page.drawImage(img, {
        x: sig.x,
        y: height - sig.y - sig.height,
        width: sig.width,
        height: sig.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "signed.pdf";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-6">PDF Signature App</h1>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileUpload}
        className="mb-4"
      />

      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${activeTool === "draw" ? "bg-blue-600 text-white" : "bg-gray-300"}`}
          onClick={() => setActiveTool("draw")}
        >
          Draw
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTool === "type" ? "bg-blue-600 text-white" : "bg-gray-300"}`}
          onClick={() => setActiveTool("type")}
        >
          Type
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTool === "upload" ? "bg-blue-600 text-white" : "bg-gray-300"}`}
          onClick={() => setActiveTool("upload")}
        >
          Upload
        </button>
      </div>

      {activeTool === "draw" && (
        drawMode ? (
          <div className="flex flex-col items-center mb-4">
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
              onClick={saveDrawnSignature}
            >
              Save Drawing
            </button>
          </div>
        ) : (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
            onClick={() => setDrawMode(true)}
          >
            Draw a Signature
          </button>
        )
      )}

      {activeTool === "type" && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Type your signature..."
            value={typedSig}
            onChange={(e) => setTypedSig(e.target.value)}
            className="border px-2 py-1 mr-2"
          />
          <button
            className="bg-green-600 text-white px-4 py-1 rounded"
            onClick={saveTypedSignature}
          >
            Add
          </button>
        </div>
      )}

      {activeTool === "upload" && (
        <input type="file" accept="image/*" onChange={handleUploadSignature} className="mb-4" />
      )}

      {pdfFile && (
        <div
          className="border bg-white p-4 relative"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div
                key={`page_${index + 1}`}
                className="pdf-page relative mb-4"
                onClick={(e) => handlePdfClick(e, index + 1)}
              >
                <Page pageNumber={index + 1} width={400} />
                {signatures
                  .filter((sig) => sig.page === index + 1)
                  .map((sig) => (
                    <img
                      key={sig.id}
                      src={sig.img}
                      alt="signature"
                      style={{
                        position: "absolute",
                        left: sig.x,
                        top: sig.y,
                        width: sig.width,
                        height: sig.height,
                        cursor: "move",
                      }}
                      onMouseDown={() => handleMouseDown(sig.id)}
                    />
                  ))}
              </div>
            ))}
          </Document>
        </div>
      )}

      <button
        className="bg-purple-600 text-white px-4 py-2 rounded mt-4 disabled:bg-gray-400"
        onClick={addSignatureToPdf}
        disabled={!pdfFile || signatures.length === 0}
      >
        Download Signed PDF
      </button>
    </div>
  );
}
