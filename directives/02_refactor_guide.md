# Irányelv: Kód Refaktorálás és Tisztítás (Refactor Guide)

## Cél

A projekt átláthatóságának és karbantarthatóságának javítása a JS kódok modulokra bontásával és a duplikációk megszüntetésével.

## Fő Elvek

1. **Moduláris felépítés**:
    - A közös logikákat (pl. naptár generálás, téma kezelés) ki kell szervezni külön fájlokba vagy jól elhatárolt függvényekbe.
    - Az `app.js` csak a kliens specifikus logikát, az `admin.js` pedig csak az admin specifikus logikát tartalmazza.

2. **Adatvezérelt működés**:
    - Kerülni kell a HTML-be égetett adatokat. Minden dinamikus tartalmat a `db.json`-ból (illetve a `localStorage`-ból) kell betölteni.

3. **Hibaüzenetek és Naplózás**:
    - Minden aszinkron műveletet és adatmentést hibakezeléssel (`try-catch`) kell ellátni.
    - A kritikus hibákat és állapotváltozásokat naplózni kell a konzolra.

## Megvalósítási lépések

- [ ] `core.js` létrehozása a közös segédfüggvényeknek (szinkronizáció, téma váltás).
- [ ] `app.js` és `admin.js` tisztítása a duplikált kódoktól.
- [ ] DOM manipulációk egységesítése (segédfüggvények használata az elemek létrehozásához).
