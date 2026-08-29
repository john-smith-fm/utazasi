import type { Place, PlaceType } from "@/types/places";
import { getBeachAccessFacts, getBeachParkingFacts, getBeachPartFacts } from "@/lib/place-facts";

const TYPE_LABEL: Record<PlaceType, string> = {
  beach: "Strand",
  restaurant: "Étterem",
  cafe: "Kávézó",
  playground: "Játszótér",
  shop: "Bolt",
  sight: "Látnivaló",
  parking: "Parkolás",
  other: "Hely",
};

/** Phone numbers stay available as secondary contact details, rather than
 * competing with the useful travel actions: navigation and the official site. */
function PhoneLinks({ phones }: { phones: readonly string[] }) {
  return <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
    {phones.map((phone) => <a key={phone} href={`tel:${phone.replace(/\s+/g, "")}`} className="inline-flex min-h-8 items-center text-sm leading-5 text-deep-sea/65 underline decoration-deep-sea/25 underline-offset-4">{phone}</a>)}
  </div>;
}

function BeachAccessDetails({ place }: { place: Place }) {
  if (place.details.kind !== "beach") return null;
  const facts = getBeachAccessFacts(place);

  if (facts.length === 0) return null;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="access-heading">
    <h2 id="access-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Megközelítés</h2>
    <ul className="mt-3 space-y-2 text-sm leading-[21px] text-deep-sea/70">
      {facts.map((fact) => <li key={fact}>{fact}</li>)}
    </ul>
  </section>;
}

function BeachPartDetails({ place }: { place: Place }) {
  if (place.details.kind !== "beach") return null;
  const facts = getBeachPartFacts(place);
  if (!facts.length) return null;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="beach-heading">
    <h2 id="beach-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Part</h2>
    <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{facts.join(" · ")}</p>
  </section>;
}

function BeachParkingDetails({ place }: { place: Place }) {
  if (place.details.kind !== "beach") return null;
  const facts = getBeachParkingFacts(place);
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="parking-heading">
    <h2 id="parking-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Parkolás</h2>
    <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{facts.length ? facts.join(" · ") : "Parkoló elérhetősége még nincs ellenőrizve."}</p>
  </section>;
}

function BeachServiceDetails({ place }: { place: Place }) {
  if (place.details.kind !== "beach" || !place.details.confirmedServices?.length) return null;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="beach-services-heading">
    <h2 id="beach-services-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Szolgáltatások</h2>
    <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{place.details.confirmedServices.join(" · ")}</p>
  </section>;
}

function BeachFamilyDetails({ place }: { place: Place }) {
  if (place.details.kind !== "beach" || !place.details.familyInsight) return null;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="beach-family-heading">
    <h2 id="beach-family-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Családdal</h2>
    <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{place.details.familyInsight}</p>
  </section>;
}

function GenericContactDetails({ place }: { place: Place }) {
  if ((place.type === "restaurant" || place.type === "shop") || (!place.contact?.phones?.length && !place.contact?.website)) return null;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="contact-heading">
    <h2 id="contact-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Kapcsolat</h2>
    {place.contact.phones?.length ? <div className="mt-3">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Telefon</h3>
      <PhoneLinks phones={place.contact.phones} />
    </div> : null}
    {place.contact.website && <a href={place.contact.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-turquoise px-4 text-sm font-semibold text-white">Weboldal megnyitása</a>}
  </section>;
}

function GenericPlaceInformation({ place }: { place: Place }) {
  if (place.details.kind === "beach" || place.details.kind === "restaurant" || place.details.kind === "shop") return null;
  const { confirmedServices, familyInsight, openingHours, openingNote } = place.details;
  if (!confirmedServices?.length && !familyInsight && !openingHours?.length && !openingNote) return null;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="place-information-heading">
    <h2 id="place-information-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">A helyről</h2>
    {familyInsight && <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{familyInsight}</p>}
    {confirmedServices?.length ? <div className="mt-4">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Biztosan elérhető</h3>
      <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{confirmedServices.join(" · ")}</p>
    </div> : null}
    {openingHours?.length ? <div className="mt-4">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Nyitvatartás</h3>
      <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{openingHours.join(" · ")}</p>
      {openingNote && <p className="mt-1 text-xs leading-[18px] text-deep-sea/55">{openingNote}</p>}
    </div> : null}
  </section>;
}

function RestaurantDetails({ place }: { place: Place }) {
  if (place.details.kind !== "restaurant") return null;
  const { mealProfiles, cuisine, openingNote, contact } = place.details;
  if (!mealProfiles?.length && !cuisine?.length && !openingNote && !contact?.website && !contact?.phones?.length) return null;

  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="restaurant-information-heading">
    <h2 id="restaurant-information-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Étterem információk</h2>
    {mealProfiles?.length || cuisine?.length ? <div className="mt-3">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Kínálat</h3>
      {mealProfiles?.length ? <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{mealProfiles.join(" · ")}</p> : null}
      {cuisine?.length ? <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{cuisine.join(" · ")}</p> : null}
    </div> : null}
    {openingNote && <div className="mt-3">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Nyitvatartás</h3>
      <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{openingNote}</p>
    </div>}
    {contact?.phones?.length ? <div className="mt-4">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Telefon</h3>
      <PhoneLinks phones={contact.phones} />
    </div> : null}
    {contact?.website && <a href={contact.website} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-turquoise px-4 text-sm font-semibold text-white">Weboldal megnyitása</a>}
  </section>;
}

function ShopDetails({ place }: { place: Place }) {
  if (place.details.kind !== "shop" || !place.details.shop) return null;
  const shop = place.details.shop;
  return <section className="border-t border-deep-sea/10 pt-6" aria-labelledby="shop-information-heading">
    <h2 id="shop-information-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Bolt információk</h2>
    {shop.familyInsight && <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{shop.familyInsight}</p>}
    {shop.openingHours && <div className="mt-4">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Nyitvatartás</h3>
      <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{shop.openingHours}</p>
      {shop.openingNote && <p className="mt-1 text-xs leading-[18px] text-deep-sea/55">{shop.openingNote}</p>}
    </div>}
    {shop.confirmedDepartments?.length ? <div className="mt-4">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Biztosan elérhető</h3>
      <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{shop.confirmedDepartments.join(" · ")}</p>
    </div> : null}
    {shop.services?.length ? <div className="mt-4">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Szolgáltatások</h3>
      <p className="mt-1 text-sm leading-[21px] text-deep-sea/70">{shop.services.join(" · ")}</p>
    </div> : null}
    {shop.phones?.length ? <div className="mt-4">
      <h3 className="text-sm font-semibold leading-5 text-deep-sea">Telefon</h3>
      <PhoneLinks phones={shop.phones} />
    </div> : null}
    {shop.website && <a href={shop.website} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-turquoise px-4 text-sm font-semibold text-white">Weboldal megnyitása</a>}
  </section>;
}

export function PlaceDetail({ place }: { place: Place }) {
  const coverImage = place.intelligence?.coverImage;
  const primaryImage = place.media?.[0] ?? (coverImage?.assetUrl
    ? {
      src: coverImage.assetUrl,
      attribution: [coverImage.attribution, coverImage.license].filter(Boolean).join(" · ") || undefined,
    }
    : undefined);
  const hasCoordinates = place.location?.latitude !== undefined && place.location?.longitude !== undefined;
  const directionsHref = place.navigation?.directionsUrl
    ?? (hasCoordinates ? `https://www.google.com/maps/dir/?api=1&destination=${place.location!.latitude},${place.location!.longitude}` : undefined);
  const mapsHref = place.navigation?.mapsUrl;
  const navigationHref = directionsHref ?? mapsHref;

  return <article>
    <header>
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-turquoise-dark">{TYPE_LABEL[place.type]}</p>
      <h1 className="mt-2 text-[clamp(28px,8vw,36px)] font-bold leading-[1.08] tracking-[-0.035em] text-deep-sea">{place.name}</h1>
      {place.location?.locality && <p className="mt-3 text-[15px] leading-5 text-deep-sea/60">{place.location.locality}</p>}
    </header>

    {primaryImage && <figure className="mt-7 overflow-hidden rounded-m bg-sand">
      <img src={primaryImage.src} alt={place.name} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
      {primaryImage.attribution && <figcaption className="px-3 py-2 text-[11px] leading-4 text-deep-sea/55">{primaryImage.attribution}</figcaption>}
    </figure>}

    {(place.shortDescription || place.description) && <section className="mt-7" aria-labelledby="description-heading">
      <h2 id="description-heading" className="sr-only">Leírás</h2>
      {place.shortDescription && <p className="text-[17px] font-medium leading-[25px] text-deep-sea">{place.shortDescription}</p>}
      {place.description && <p className="mt-3 text-sm leading-[21px] text-deep-sea/70">{place.description}</p>}
    </section>}

    {place.location?.address && <section className="mt-7 border-t border-deep-sea/10 pt-6" aria-labelledby="address-heading">
      <h2 id="address-heading" className="text-[17px] font-bold leading-[23px] text-deep-sea">Cím</h2>
      <p className="mt-2 text-sm leading-[21px] text-deep-sea/70">{place.location.address}</p>
    </section>}

    <div className="mt-8 space-y-8">
      <BeachPartDetails place={place} />
      <BeachAccessDetails place={place} />
      <BeachParkingDetails place={place} />
      <BeachServiceDetails place={place} />
      <BeachFamilyDetails place={place} />
      <RestaurantDetails place={place} />
      <ShopDetails place={place} />
      <GenericPlaceInformation place={place} />
      <GenericContactDetails place={place} />
      {navigationHref && <a href={navigationHref} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-turquoise px-4 text-sm font-semibold text-white">{directionsHref ? "Navigáció megnyitása" : "Megnyitás Google Térképen"}</a>}
    </div>
  </article>;
}
