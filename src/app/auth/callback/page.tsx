export default function AuthCallbackPage() {
  return <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-deep-sea px-6 text-center text-quartz">
    <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url("/images/hero.jpg")' }} />
    <section className="relative max-w-xs"><img src="/images/utazasi-logo-white.svg" alt="Utazási" className="mx-auto h-20 w-20 object-contain" /><h1 className="mt-7 font-display text-3xl font-semibold tracking-[-.04em]">Belépés az appban</h1><p className="mt-3 text-sm leading-6 text-white/75">Az Utazási a telepített alkalmazásban kéri a belépési kódot. Nyisd meg az appot, és írd be az e-mailben kapott kódot.</p></section>
  </main>;
}
