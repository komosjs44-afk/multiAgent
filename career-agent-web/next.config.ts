import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse(pdfjs-dist)는 자신의 워커 스크립트를 node_modules 안에서 상대 경로로 직접 찾습니다.
  // Next.js가 서버 코드를 번들링하면 이 경로 해석이 깨져 "Setting up fake worker failed"로
  // PDF 추출이 실패합니다(로컬 dev에서 재현 확인). 이 두 패키지를 번들링 대상에서 제외하고
  // 런타임에 node_modules에서 그대로 require하도록 해서 워커 파일 경로가 그대로 유지되게 합니다.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
