/**
 * 静的サイトとして書き出す (サーバ不要 / API 費用ゼロ)。
 * GitHub Pages ではリポジトリ名のサブパスで配信されるため、
 * ビルド時に NEXT_PUBLIC_BASE_PATH=/inquiry-buddy-lite を渡す。
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
