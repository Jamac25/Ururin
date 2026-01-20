# Ololeeye - User Guide / Tilaajakäyttöohje

## 🌟 Tervetuloa / Soo dhawoow!

Ololeeye on WhatsApp-pohjainen rahankeräyssovellus Somalian yhteisöille.

---

## 📱 Pika-aloitus / Bilow Degdeg

### 1. Avaa sovellus
Mene osoitteeseen: `https://your-app-url.com`

### 2. Luo ensimmäinen kampanja
1. Klikkaa **+** -nappia
2. Täytä tiedot:
   - **Nimi**: Kampanjan nimi (esim. "Caafimaad Fund")
   - **Tavoite**: Rahasumma (esim. 5000)
   - **Zaad-numero**: Maksunumerosi
   - **PIN**: 4-numeroinen koodi (muista tämä!)
3. Klikkaa **"Abuur Ololaha"** (Luo kampanja)

### 3. Lisää lahjoittajat
1. Avaa kampanja
2. Klikkaa **"Ku Dar Tabaruce"** (Lisää lahjoittaja)
3. Täytä:
   - **Nimi**: Lahjoittajan nimi
   - **Puhelin**: Puhelinnumero
   - **Summa**: Luvattu summa
4. Tallenna

### 4. Lähetä viestit WhatsAppiin
1. Kampanjasivulla, scrollaa kohtaan **"📤 Jaa & Viesti"**
2. Klikkaa **"Kopioi Liiska"**
3. Avaa WhatsApp
4. Liitä (Ctrl+V) ja lähetä ryhmään!

---

## 📖 Yksityiskohtaiset ohjeet

### Kampanjoiden hallinta

#### Kampanjan luominen
```
1. Pääsivu → Klikkaa + -nappi
2. Täytä lomake:
   - Emoji (valinnainen)
   - Nimi (pakollinen)
   - Kuvaus
   - Tavoite (pakollinen, > 0)
   - Deadline (valinnainen)
   - Zaad-numero (pakollinen, min 9 numeroa)
   - PIN (pakollinen, täsmälleen 4 numeroa)
3. Klikkaa "Abuur Ololaha"
```

#### Kampanjan muokkaus
```
1. Avaa kampanja
2. Klikkaa ✏️ -kuvaketta
3. Muuta tietoja
4. Tallenna
```

#### Kampanjan poisto
```
1. Avaa kampanja
2. Klikkaa 🗑️ -kuvaketta
3. Vahvista poisto
⚠️ Kaikki lahjoittajat poistetaan myös!
```

### Lahjoittajien hallinta

#### Lahjoittajan lisäys
```
1. Avaa kampanja
2. Klikkaa "Ku Dar Tabaruce"
3. Täytä:
   - Nimi (pakollinen)
   - Puhelin (pakollinen, esim. 252634111111)
   - Summa (pakollinen, > 0)
   - Tila (Odottaa/Maksettu/Hylätty)
4. Tallenna
```

#### Tilan päivitys
```
Nopea tapa:
1. Kampanjasivulla, etsi lahjoittaja
2. Klikkaa tila-nappia:
   - 🟡 Sugaya (Odottaa)
   - 🟢 Bixiyey (Maksettu)
   - 🔴 Diidey (Hylätty)
```

#### Lahjoittajan muokkaus
```
1. Klikkaa lahjoittajan nimeä
2. Klikkaa ✏️ -kuvaketta
3. Muuta tietoja
4. Tallenna
```

### WhatsApp-integraatio

#### Lista maksajista (Liiska)
```
1. Avaa kampanja
2. Scrollaa "📤 Jaa & Viesti" -osioon
3. Klikkaa "Kopioi Liiska"
4. Avaa WhatsApp
5. Liitä (Ctrl+V / Cmd+V)
6. Lähetä ryhmään tai yksittäiselle

Sisältää:
- Kaikki lahjoittajat + summat
- ✅ Maksetut / ❌ Maksamattomat
- Yhteenveto (maksettu, maksamatta, jäljellä)
- Zaad-numero
```

#### Ryhmäpäivitys
```
1. Klikkaa "Kopioi Ryhmäpäivitys"
2. Liitä WhatsAppiin

Sisältää:
- Kerätty summa
- Tavoite
- Prosentti
- Montako maksanut
- Liittymislinkki
```

#### Yksittäinen viesti
```
1. Klikkaa lahjoittajan nimeä
2. Klikkaa "📱 Lähetä WhatsApp"
3. Valitse viestyyppi:
   - Alkuperäinen pyyntö
   - Muistutus
   - Kiitos
4. WhatsApp avautuu valmiilla viestillä
```

### Tilastot

#### Tilastosivun avaaminen
```
1. Alanavigaatio → Klikkaa "Xogta" (Tilastot)
2. Näet:
   - Yhteenveto (kerätty, tavoite, %)
   - 4 pika-tilastoa
   - Kampanjoiden suorituskyky (kaavio)
   - Top kampanjat & lahjoittajat
   - Keräysaikajana (14 päivää)
   - Tila-jako (piirakka)
   - Viimeisimmät tapahtumat
```

#### Kaavioiden käyttö
```
- Klikkaa palkkia → Siirry kampanjaan
- Hover → Näytä yksityiskohdat
- Interaktiiviset ja responsiiviset
```

### Vienti ja varmuuskopiointi

#### Excel-vienti
```
1. Tilastot-sivu
2. Klikkaa "Export Dhammaan Ololaha (Excel)"
3. CSV-tiedosto latautuu
4. Avaa Excelissä tai Google Sheetsissa
```

#### JSON-vienti (varmuuskopio)
```
1. Tilastot-sivu
2. Klikkaa "Export Data (JSON)"
3. Tallenna tiedosto turvalliseen paikkaan
4. Voit tuoda takaisin "Import Data" -napilla
```

### Cloud Sync (Supabase)

#### Tilin luominen
```
1. Klikkaa ⚙️ (Asetukset)
2. Klikkaa "Register"
3. Täytä:
   - Nimi
   - Sähköposti
   - Salasana (min 6 merkkiä)
4. Vahvista sähköposti
5. Kirjaudu sisään
```

#### Datan siirto pilveen
```
1. Kirjaudu sisään
2. Mene Tilastot-sivulle
3. Etsi "☁️ Cloud Sync" -osio
4. Klikkaa "Gudbiso Cloud-ka"
5. Vahvista
6. Data siirtyy Supabaseen
7. Voit nyt käyttää eri laitteilla!
```

---

## 🔧 Asetukset

### Valuutta
```
1. Asetukset → "Calaamadda Lacagta"
2. Vaihda symboli (esim. $, €, £)
3. Tallenna
```

### Oletus Zaad-numero
```
1. Asetukset → "Lambarka Zaad ee Default"
2. Syötä numero
3. Tallenna
```

### Teema
```
Klikkaa 🌙/☀️ -kuvaketta oikeassa yläkulmassa
- Vaihtaa tumman/vaalean tilan välillä
```

---

## 💡 Vinkit ja niksit

### Nopeat toiminnot
- **Kaksoisklikkaa kampanjaa** → Avaa suoraan
- **Swipe vasemmalle** (mobiili) → Poista
- **Klikkaa tilastoja** → Suodata näkymä

### Offline-käyttö
- Sovellus toimii ilman nettiä
- Data tallennetaan laitteelle
- Synkkaa pilveen kun verkko palaa

### Turvallisuus
- **PIN-koodi** suojaa kampanjan
- Kukaan ei voi muokata ilman PIN:iä
- Pidä PIN turvassa!

### Varmuuskopiointi
- **Vie data säännöllisesti** (JSON)
- Tallenna tiedosto turvalliseen paikkaan
- Tai käytä Cloud Sync -ominaisuutta

---

## ❓ Usein kysytyt kysymykset (FAQ)

### Miten muutan kampanjan tavoitetta?
Avaa kampanja → Klikkaa ✏️ → Muuta "Goal" → Tallenna

### Miten merkitsen jonkun maksaneeksi?
Kampanjasivulla → Klikkaa lahjoittajan kohdalla "🟢 Bixiyey"

### Miten lähetän muistutuksen kaikille?
Klikkaa "Kopioi Liiska" → Liitä WhatsAppiin → Lähetä ryhmään

### Miten poistan vahingossa lisätyn henkilön?
Klikkaa henkilön nimeä → Klikkaa 🗑️ → Vahvista

### Toimiiko sovellus ilman nettiä?
Kyllä! Kaikki data tallennetaan laitteelle.

### Miten saan datan toiselle laitteelle?
Kaksi tapaa:
1. Vie JSON → Tuo toisella laitteella
2. Käytä Cloud Sync (vaatii tilin)

### Miten vaihdan PIN-koodin?
Avaa kampanja → Klikkaa ✏️ → Muuta "PIN" → Tallenna

### Miten poistan koko kampanjan?
Avaa kampanja → Klikkaa 🗑️ → Vahvista
⚠️ Kaikki lahjoittajat poistetaan myös!

---

## 🆘 Tuki ja ongelmanratkaisu

### Sovellus ei lataudu
1. Päivitä sivu (F5 / Cmd+R)
2. Tyhjennä välimuisti
3. Kokeile toista selainta

### Data katosi
1. Tarkista onko oikeassa selaimessa
2. Tarkista localStorage (DevTools)
3. Palauta varmuuskopiosta (JSON)

### Kaaviot eivät näy
1. Päivitä sivu
2. Varmista että Chart.js latautuu
3. Tarkista konsoli virheistä (F12)

### WhatsApp ei avaudu
1. Varmista että WhatsApp on asennettu
2. Kokeile WhatsApp Web:iä
3. Kopioi viesti manuaalisesti

---

## 📞 Yhteystiedot

Ongelmia? Kysymyksiä?
- GitHub: [your-repo-url]
- Email: [your-email]

---

**Versio:** 1.0.0  
**Päivitetty:** 2026-01-20  
**Kieli:** Suomi / Somali
