// Google Apps Script - Upload de fotos do Diario de Obra para o Google Drive
// 1) Crie uma pasta no Google Drive.
// 2) Copie o ID da pasta e cole em FOLDER_ID.
// 3) Opcional: mantenha o mesmo UPLOAD_TOKEN configurado no .env.local.
// 4) Publique como Web App: Deploy > New deployment > Web app.
//    Execute as: Me / Who has access: Anyone.

const FOLDER_ID = "COLE_AQUI_O_ID_DA_PASTA_DO_GOOGLE_DRIVE";
const UPLOAD_TOKEN = "controle-obra-2026";

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (UPLOAD_TOKEN && body.token !== UPLOAD_TOKEN) {
      throw new Error("Token de upload invalido.");
    }

    if (!body.base64 || !body.fileName) {
      throw new Error("Arquivo nao recebido pelo Apps Script.");
    }

    const bytes = Utilities.base64Decode(body.base64);
    const blob = Utilities.newBlob(bytes, body.mimeType || "image/jpeg", body.fileName);

    const folder = FOLDER_ID && FOLDER_ID.indexOf("COLE_AQUI") === -1
      ? DriveApp.getFolderById(FOLDER_ID)
      : DriveApp.getRootFolder();

    const safeDiario = body.diarioId ? String(body.diarioId).substring(0, 8) : "sem-diario";
    const safeName = safeDiario + "-" + new Date().getTime() + "-" + body.fileName;
    const file = folder.createFile(blob).setName(safeName);

    // Necessario para o sistema conseguir exibir a miniatura da foto.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const id = file.getId();
    const result = {
      success: true,
      fileId: id,
      name: file.getName(),
      viewUrl: "https://drive.google.com/file/d/" + id + "/view?usp=sharing",
      thumbnailUrl: "https://drive.google.com/thumbnail?id=" + id + "&sz=w1000",
      url: "https://drive.google.com/file/d/" + id + "/view?usp=sharing"
    };

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
