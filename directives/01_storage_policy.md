# Irányelv: Adattárolás és Szinkronizáció (Storage Policy)

## Cél

Biztosítani az alkalmazás adatainak megőrzését a böngésző `localStorage`-án kívül, egy fix fájlrendszer alapú struktúrában a `data/` mappában.

## Folyamat

1. **Adatok mentése (Export)**:
    - Az Ügynök időnként (vagy kérésre) beolvassa a böngésző állapotát (vagy a felhasználó által beküldött adatokat).
    - Lefuttatja az `execution/sync_db.ps1` scriptet `-Action Export` paraméterrel.
    - A script kimenti az adatokat a `data/db.json` fájlba.

2. **Adatok betöltése (Import)**:
    - Ha a böngésző adatai elvesznek vagy inicializálni kell a rendszert, az Ügynök lefuttatja a `execution/sync_db.ps1` scriptet `-Action Import` paraméterrel.
    - A script beolvassa a `data/db.json` tartalmát.

## Szabályok

- A `data/db.json` fájlt soha nem szerkesztjük manuálisan, kivéve ha az adatszerkezet változik.
- Minden fontos változás (új regisztráció, új foglalás) után javasolt egy szinkronizáció.
- Az Ügynök felelős a `localStorage` és a `db.json` közötti konzisztenciáért.
