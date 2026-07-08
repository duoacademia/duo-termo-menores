(function () {
  "use strict";

  const termText = "Eu, RESPONSAVEL, portador(a) do CPF RESPONSAVEL_CPF, residente e domiciliado(a) em ENDERECO, venho atraves do presente instrumento, conforme portaria no 06/11 do TJPE, autorizar meu/minha filho(a) MENOR, nascido(a) em NASCIMENTO e portador(a) do CPF MENOR_CPF, menor de 18 anos, a se matricular na DUO Academia, comprometendo-me a monitorar seus horarios e dias de frequencia, para garantir que nao sejam prejudicados seus horarios escolares, e ainda acompanhar sua condicao de saude, para que sempre esteja apto(a) a desenvolver os exercicios sem qualquer prejuizo para sua condicao fisica/psiquica.";

  function normalizePdfText(text) {
    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—]/g, "-")
      .replace(/[“”]/g, "\"")
      .replace(/[‘’]/g, "'");
  }

  function formatStudentPdfName(name) {
    const safeName = String(name || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|#{}%~&]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase() || "ALUNO";
    return `${safeName}.pdf`;
  }

  function dataUriToBase64(dataUri) {
    return dataUri.split(",")[1];
  }

  function addWrappedText(doc, text, x, y, maxWidth, lineHeight) {
    const lines = doc.splitTextToSize(normalizePdfText(text), maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  function dateToBR(dateValue) {
    if (!dateValue) return "";
    const parts = dateValue.split("-");
    if (parts.length !== 3) return dateValue;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function imageToDataUrl(path) {
    return fetch(path)
      .then(function (response) {
        if (!response.ok) throw new Error("Não foi possível carregar a logo.");
        return response.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          const reader = new FileReader();
          reader.onload = function () { resolve(reader.result); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      })
      .then(function (dataUrl) {
        return imageDataUrlToJpeg(dataUrl, 360, 360, 0.84);
      });
  }

  function imageDataUrlToJpeg(dataUrl, maxWidth, maxHeight, quality) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.onload = function () {
        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      image.onerror = reject;
      image.src = dataUrl;
    });
  }

  function submitToDrive(payload) {
    const config = window.DuoConfig || {};
    const uploadUrl = config.driveUploadUrl;

    if (!uploadUrl) {
      return Promise.resolve({ uploaded: false });
    }

    return new Promise(function (resolve, reject) {
      let settled = false;
      const body = JSON.stringify(Object.assign({}, payload, {
        token: config.uploadToken || ""
      }));

      const timeout = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        resolve({ uploaded: true });
      }, 7000);

      fetch(uploadUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body
      }).then(function () {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        resolve({ uploaded: true });
      }).catch(function (error) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        reject(error);
      });
    });
  }

  function drawFieldBox(doc, label, value, x, y, width) {
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, width, 13, 2, 2, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(normalizePdfText(label), x + 3, y + 4);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.4);
    doc.text(normalizePdfText(value || "-"), x + 3, y + 9.6);
  }

  function buildTerm(data) {
    const address = `${data.logradouro}, no ${data.numero}, bairro ${data.bairro}, ${data.cidade} - ${data.uf}`;
    return termText
      .replace("RESPONSAVEL_CPF", data.responsavelCpf)
      .replace("RESPONSAVEL", data.responsavelNome)
      .replace("ENDERECO", address)
      .replace("NASCIMENTO", dateToBR(data.menorNascimento))
      .replace("MENOR_CPF", data.menorCpf)
      .replace("MENOR", data.menorNome);
  }

  function drawPdf(data, logoDataUrl) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error("A biblioteca de PDF ainda não carregou. Verifique a conexão e tente novamente.");
    }

    const doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    let y = 12;

    doc.addImage(logoDataUrl, "JPEG", margin, y - 1, 22, 22);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.2);
    doc.text("TERMO DE AUTORIZACAO PARA CONTRATANTES MENORES", margin, y + 29);
    doc.setDrawColor(0, 109, 182);
    doc.setLineWidth(0.7);
    doc.line(margin, y + 33, pageWidth - margin, y + 33);

    y += 43;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Data: ${data.date}`, margin, y);
    doc.text(`Hora: ${data.time}`, pageWidth - margin - 34, y);
    y += 9;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text("Dados do responsavel legal", margin, y);
    y += 5;
    drawFieldBox(doc, "Nome completo", data.responsavelNome, margin, y, pageWidth - margin * 2);
    y += 15;
    drawFieldBox(doc, "CPF", data.responsavelCpf, margin, y, pageWidth - margin * 2);
    y += 15;
    drawFieldBox(doc, "Endereco", `${data.logradouro}, no ${data.numero}, ${data.bairro}`, margin, y, pageWidth - margin * 2);
    y += 15;
    const halfWidth = (pageWidth - margin * 2 - 8) / 2;
    drawFieldBox(doc, "Cidade/UF", `${data.cidade} - ${data.uf}`, margin, y, halfWidth);
    drawFieldBox(doc, "Telefone", data.telefone, margin + halfWidth + 8, y, halfWidth);
    y += 21;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    doc.text("Dados do menor contratante", margin, y);
    y += 5;
    drawFieldBox(doc, "Nome completo", data.menorNome, margin, y, pageWidth - margin * 2);
    y += 15;
    drawFieldBox(doc, "CPF", data.menorCpf, margin, y, halfWidth);
    drawFieldBox(doc, "Nascimento", dateToBR(data.menorNascimento), margin + halfWidth + 8, y, halfWidth);
    y += 20;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 47, 2, 2, "FD");
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.6);
    doc.text("Termo de autorizacao", margin + 4, y + 1.8);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    addWrappedText(doc, buildTerm(data), margin + 4, y + 8, pageWidth - margin * 2 - 8, 3.5);
    y += 52;

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("Rubrica ou assinatura do responsavel", margin, y);
    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 38, 3, 3);
    doc.addImage(data.signatureImage, "JPEG", margin + 4, y + 4, pageWidth - margin * 2 - 8, 26);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.text("Assinatura manuscrita do responsavel legal", margin + 4, y + 34);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.text("Documento assinado eletronicamente antes da matricula.", margin, pageHeight - 8);

    return doc;
  }

  async function generateDocument(data) {
    const logoDataUrl = await imageToDataUrl("logo.png");
    const compressedSignature = await imageDataUrlToJpeg(data.signatureImage, 900, 320, 0.8);
    const doc = drawPdf(Object.assign({}, data, { signatureImage: compressedSignature }), logoDataUrl);
    const pdfFileName = formatStudentPdfName(data.menorNome);
    const uploadResult = await submitToDrive({
      pdfFileName,
      pdfBase64: dataUriToBase64(doc.output("datauristring")),
      meta: {
        studentName: data.menorNome,
        cpf: data.menorCpf,
        signedDate: data.date,
        signedTime: data.time,
        documentType: "TERMO DE MENORES",
        guardianName: data.responsavelNome,
        guardianCpf: data.responsavelCpf
      }
    });

    if (uploadResult.uploaded) {
      return uploadResult;
    }

    doc.save(pdfFileName);
    return { uploaded: false, downloaded: true };
  }

  window.DuoMinorTermDocuments = { generateDocument };
})();
