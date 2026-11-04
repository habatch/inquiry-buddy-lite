"use client";

/**
 * 画面の表示中に予期しないエラーが起きたときの救出画面。
 * 記録 (localStorage) はそのまま残っているので、ファイルとして書き出せるようにする。
 */
import { readAllRaw } from "@/lib/storage";
import { saveBlob } from "@/lib/file";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  function rescue() {
    const all = readAllRaw();
    if (Object.keys(all).length === 0) {
      alert("この端末には記録が見つかりませんでした。");
      return;
    }
    saveBlob(
      new Blob([JSON.stringify(all, null, 2)], { type: "application/json" }),
      `探究ノート_救出_${new Date().toISOString().slice(0, 10)}.json`,
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <p className="text-3xl">🛟</p>
        <h1 className="mt-2 text-lg font-bold text-stone-800">うまく表示できませんでした</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          書いた記録はこの端末に残っています。念のため、まず記録をファイルに書き出してから、もう一度開いてみてください。
          このファイルは「バックアップ読み込み」で元に戻せます。
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button onClick={rescue} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            記録をファイルに書き出す
          </button>
          <button onClick={() => reset()} className="rounded-lg bg-stone-100 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-200">
            もう一度開く
          </button>
        </div>
        <p className="mt-4 break-all text-xs text-stone-400">エラー内容 (先生に伝えてください): {error.message}</p>
      </div>
    </main>
  );
}
