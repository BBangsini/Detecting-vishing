// 보이스피싱 판별 AI - 백엔드 서버
// 실행 전: .env 파일에 GEMINI_API_KEY=발급받은키 를 넣어주세요
// 실행: npm install && npm start

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");
const { parseAndValidate } = require("./validate-response");
const { SYSTEM_PROMPT } = require("./system-prompt");

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️  GEMINI_API_KEY가 설정되지 않았습니다. 환경변수로 등록해주세요."
  );
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
];

app.post("/analyze", upload.single("audio"), async (req, res) => {
  try {
    const hasAudio = !!req.file;
    const hasText = !!req.body?.script?.trim();

    if (!hasAudio && !hasText) {
      return res
        .status(400)
        .json({ error: "텍스트 또는 오디오 파일이 필요합니다." });
    }

    if (hasAudio && !ALLOWED_AUDIO_TYPES.includes(req.file.mimetype)) {
      return res
        .status(400)
        .json({ error: "지원하지 않는 오디오 형식입니다. (MP3, WAV, M4A만 가능)" });
    }

    let contents;

    if (hasAudio) {
      const uploadedFile = await ai.files.upload({
        file: new Blob([req.file.buffer], { type: req.file.mimetype }),
        config: { mimeType: req.file.mimetype },
      });

      contents = [
        {
          role: "user",
          parts: [
            { text: "다음 통화 녹음을 분석하세요." },
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: req.file.mimetype,
              },
            },
          ],
        },
      ];
    } else {
      contents = [
        {
          role: "user",
          parts: [
            { text: "다음 통화 스크립트를 분석하세요:\n\n" + req.body.script },
          ],
        },
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const validation = parseAndValidate(response.text);
    if (!validation.success) {
      console.error("응답 검증 실패:", validation.error, "원본:", response.text);
      return res.status(502).json({
        error: "분석 결과를 처리하는 데 문제가 발생했습니다. 다시 시도해주세요.",
      });
    }

    return res.json(validation.data);
  } catch (err) {
    console.error("분석 실패:", err);
    return res.status(500).json({ error: "분석 중 오류가 발생했습니다." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`서버 실행 중: http://localhost:${PORT}`)
);
