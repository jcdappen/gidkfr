// update-dashboard.js
const fs = require('fs');
const Papa = require('papaparse');

// CSV Datei lesen
function readCSV() {
    try {
        console.log('📖 Lese CSV-Datei...');
        
        // Suche nach CSV-Datei (mit einem oder zwei Punkten)
        let csvFileName = 'zahlen_aktuell.csv';
        if (!fs.existsSync(csvFileName)) {
            csvFileName = 'zahlen_aktuell..csv';
        }
        
        if (!fs.existsSync(csvFileName)) {
            console.error('❌ Keine CSV-Datei gefunden! Gesucht: zahlen_aktuell.csv oder zahlen_aktuell..csv');
            return null;
        }
        
        console.log('📄 Verwende CSV-Datei:', csvFileName);
        const csvData = fs.readFileSync(csvFileName, 'utf8');
        console.log('✅ CSV erfolgreich gelesen');
        console.log('CSV Rohinhalt (komplett):', csvData);
        
        const parsed = Papa.parse(csvData, {
            header: false,
            delimiter: ';',
            skipEmptyLines: false // Wichtig: auch leere Zeilen beibehalten
        });
        
        console.log('📊 Parsed Daten:', parsed.data.length, 'Zeilen');
        console.log('📊 Komplette parsed Daten:', JSON.stringify(parsed.data, null, 2));
        return parsed.data;
    } catch (error) {
        console.error('❌ Fehler beim Lesen der CSV:', error);
        return null;
    }
}

// Deutsche Zahlenformate in Numbers umwandeln
function parseGermanNumber(str) {
    if (!str || str === '' || str.includes('Keine Daten') || str === '-   €') return 0;
    
    try {
        const cleaned = str.toString().replace(/\./g, '').replace(',', '.').replace('€', '').replace(/\s/g, '').trim();
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    } catch (error) {
        console.warn('⚠️ Konnte Zahl nicht parsen:', str);
        return 0;
    }
}

// Daten extrahieren und bereinigen
function extractData(csvData) {
    console.log('🔍 Extrahiere Daten...');
    console.log('📊 CSV hat', csvData.length, 'Zeilen');
    
    // Debug: Zeige ALLE Zeilen der CSV
    csvData.forEach((row, index) => {
        console.log(`Zeile ${index}:`, row);
    });
    
    const data = {};
    
    try {
        // Strategie 1: Suche nach "Einnahmen" (case insensitive)
        let einnahmenRowIndex = -1;
        for (let i = 0; i < csvData.length; i++) {
            if (csvData[i][0] && csvData[i][0].toString().toLowerCase().includes('einnahmen')) {
                einnahmenRowIndex = i;
                console.log('💰 Einnahmen-Zeile gefunden bei Index', i);
                break;
            }
        }
        
        // Strategie 2: Falls nicht gefunden, nehme erste Zeile
        if (einnahmenRowIndex === -1) {
            console.log('⚠️ Keine "Einnahmen"-Zeile gefunden, versuche erste Zeile...');
            einnahmenRowIndex = 0;
        }
        
        data.einnahmen = [];
        if (einnahmenRowIndex >= 0 && csvData[einnahmenRowIndex]) {
            const einnahmenRow = csvData[einnahmenRowIndex];
            console.log('💰 Verwende Zeile', einnahmenRowIndex, 'für Einnahmen:', einnahmenRow);
            
            // Versuche verschiedene Spalten-Indices
            for (let i = 1; i <= 12; i++) {
                if (einnahmenRow[i] !== undefined) {
                    const value = parseGermanNumber(einnahmenRow[i]);
                    data.einnahmen.push(value);
                    console.log(`  Spalte ${i}: "${einnahmenRow[i]}" -> ${value}`);
                    if (data.einnahmen.length >= 6) break; // Nur 6 Monate
                }
            }
        }
        
        // Falls immer noch leer, fülle mit Nullen
        while (data.einnahmen.length < 6) {
            data.einnahmen.push(0);
        }
        
        // Ausgaben ähnlich behandeln
        let ausgabenRowIndex = -1;
        for (let i = 0; i < csvData.length; i++) {
            if (csvData[i][0] && csvData[i][0].toString().toLowerCase().includes('ausgaben')) {
                ausgabenRowIndex = i;
                console.log('💸 Ausgaben-Zeile gefunden bei Index', i);
                break;
            }
        }
        
        if (ausgabenRowIndex === -1) {
            console.log('⚠️ Keine "Ausgaben"-Zeile gefunden, versuche zweite Zeile...');
            ausgabenRowIndex = 1;
        }
        
        data.ausgaben = [];
        if (ausgabenRowIndex >= 0 && csvData[ausgabenRowIndex]) {
            const ausgabenRow = csvData[ausgabenRowIndex];
            console.log('💸 Verwende Zeile', ausgabenRowIndex, 'für Ausgaben:', ausgabenRow);
            
            for (let i = 1; i <= 12; i++) {
                if (ausgabenRow[i] !== undefined) {
                    const value = parseGermanNumber(ausgabenRow[i]);
                    data.ausgaben.push(value);
                    console.log(`  Spalte ${i}: "${ausgabenRow[i]}" -> ${value}`);
                    if (data.ausgaben.length >= 6) break;
                }
            }
        }
        
        while (data.ausgaben.length < 6) {
            data.ausgaben.push(0);
        }
        
        // Kumuliert
        let kumuliertRowIndex = -1;
        for (let i = 0; i < csvData.length; i++) {
            if (csvData[i][0] && csvData[i][0].toString().toLowerCase().includes('kumuliert')) {
                kumuliertRowIndex = i;
                break;
            }
        }
        
        data.kumuliert = [];
        if (kumuliertRowIndex >= 0 && csvData[kumuliertRowIndex]) {
            const kumuliertRow = csvData[kumuliertRowIndex];
            console.log('📈 Kumuliert Zeile gefunden bei Index', kumuliertRowIndex, ':', kumuliertRow);
            for (let i = 1; i <= 12; i++) {
                if (kumuliertRow[i] !== undefined) {
                    const value = parseGermanNumber(kumuliertRow[i]);
                    data.kumuliert.push(value);
                    if (data.kumuliert.length >= 6) break;
                }
            }
        } else {
            // Fallback: Kumuliert selbst berechnen
            console.log('⚠️ Kumuliert-Zeile nicht gefunden, berechne selbst...');
            let cumulative = 0;
            for (let i = 0; i < 6; i++) {
                cumulative += (data.einnahmen[i] - data.ausgaben[i]);
                data.kumuliert.push(cumulative);
            }
        }
        
        while (data.kumuliert.length < 6) {
            data.kumuliert.push(0);
        }
        
        // Kontostand 2025 (suche nach "kontostand 25")
        let kontostand2025RowIndex = -1;
        for (let i = 0; i < csvData.length; i++) {
            if (csvData[i][0] && csvData[i][0].toString().toLowerCase().includes('kontostand 25')) {
                kontostand2025RowIndex = i;
                break;
            }
        }
        
        data.kontostand = [];
        if (kontostand2025RowIndex >= 0 && csvData[kontostand2025RowIndex]) {
            const kontostand2025Row = csvData[kontostand2025RowIndex];
            console.log('🏦 Kontostand 2025 Zeile gefunden bei Index', kontostand2025RowIndex, ':', kontostand2025Row);
            for (let i = 1; i <= 12; i++) {
                if (kontostand2025Row[i] !== undefined) {
                    const value = parseGermanNumber(kontostand2025Row[i]);
                    data.kontostand.push(value);
                    if (data.kontostand.length >= 6) break;
                }
            }
        } else {
            console.log('⚠️ Kontostand 2025-Zeile nicht gefunden, setze Standard-Werte...');
            for (let i = 0; i < 6; i++) {
                data.kontostand.push(50000 - (i * 1000));
            }
        }
        
        while (data.kontostand.length < 6) {
            data.kontostand.push(0);
        }
        
        // Kontostand 2024 (suche nach "kontostand 24")
        let kontostand2024RowIndex = -1;
        for (let i = 0; i < csvData.length; i++) {
            if (csvData[i][0] && csvData[i][0].toString().toLowerCase().includes('kontostand 24')) {
                kontostand2024RowIndex = i;
                break;
            }
        }
        
        data.kontostand2024 = [];
        if (kontostand2024RowIndex >= 0 && csvData[kontostand2024RowIndex]) {
            const kontostand2024Row = csvData[kontostand2024RowIndex];
            console.log('🏦 Kontostand 2024 Zeile gefunden bei Index', kontostand2024RowIndex, ':', kontostand2024Row);
            for (let i = 1; i <= 12; i++) {
                if (kontostand2024Row[i] !== undefined) {
                    const value = parseGermanNumber(kontostand2024Row[i]);
                    data.kontostand2024.push(value);
                    if (data.kontostand2024.length >= 12) break;
                }
            }
        } else {
            console.log('⚠️ Kontostand 2024-Zeile nicht gefunden');
            for (let i = 0; i < 12; i++) {
                data.kontostand2024.push(0);
            }
        }
        
        while (data.kontostand2024.length < 12) {
            data.kontostand2024.push(0);
        }
        
        // Gesamtsummen berechnen
        data.gesamtEinnahmen = data.einnahmen.reduce((a, b) => a + b, 0);
        data.gesamtAusgaben = data.ausgaben.reduce((a, b) => a + b, 0);
        
        console.log('✅ Finale Daten:');
        console.log('📊 Einnahmen:', data.einnahmen);
        console.log('📊 Ausgaben:', data.ausgaben);
        console.log('📊 Kumuliert:', data.kumuliert);
        console.log('📊 Kontostand 2025:', data.kontostand);
        console.log('📊 Kontostand 2024:', data.kontostand2024);
        console.log('📊 Gesamt Einnahmen:', data.gesamtEinnahmen);
        console.log('📊 Gesamt Ausgaben:', data.gesamtAusgaben);
        console.log('📊 Ergebnis:', data.gesamtEinnahmen - data.gesamtAusgaben);
        
        return data;
    } catch (error) {
        console.error('❌ Fehler beim Extrahieren der Daten:', error);
        return null;
    }
}

// Quartale berechnen
function calculateQuarters(data) {
    console.log('🗓️ Berechne Quartale...');
    const quarters = [];
    
    try {
        // Q1 (Jan-Mar) - Indizes 0,1,2
        const q1Einnahmen = data.einnahmen.slice(0, 3).reduce((a, b) => a + b, 0);
        const q1Ausgaben = data.ausgaben.slice(0, 3).reduce((a, b) => a + b, 0);
        quarters.push({
            name: 'Q1 2025',
            period: 'Januar - März',
            einnahmen: q1Einnahmen,
            ausgaben: q1Ausgaben,
            ergebnis: q1Einnahmen - q1Ausgaben,
            kumuliert: data.kumuliert[2] || 0, // März
            kontostand: data.kontostand[2] || 0, // März
            hasData: q1Einnahmen > 0 || q1Ausgaben > 0
        });
        
        // Q2 (Apr-Jun) - Indizes 3,4,5
        const q2Einnahmen = data.einnahmen.slice(3, 6).reduce((a, b) => a + b, 0);
        const q2Ausgaben = data.ausgaben.slice(3, 6).reduce((a, b) => a + b, 0);
        quarters.push({
            name: 'Q2 2025',
            period: 'April - Juni',
            einnahmen: q2Einnahmen,
            ausgaben: q2Ausgaben,
            ergebnis: q2Einnahmen - q2Ausgaben,
            kumuliert: data.kumuliert[5] || 0, // Juni
            kontostand: data.kontostand[5] || 0, // Juni
            hasData: q2Einnahmen > 0 || q2Ausgaben > 0
        });
        
        // Q3 & Q4 (Keine Daten)
        quarters.push({
            name: 'Q3 2025',
            period: 'Juli - September',
            hasData: false
        });
        
        quarters.push({
            name: 'Q4 2025',
            period: 'Oktober - Dezember',
            hasData: false
        });
        
        console.log('✅ Quartale berechnet:', quarters.length);
        return quarters;
    } catch (error) {
        console.error('❌ Fehler beim Berechnen der Quartale:', error);
        return [];
    }
}

// HTML Template laden und Daten einsetzen
function generateHTML(data, quarters) {
    console.log('🎨 Generiere HTML...');
    
    try {
        // Prüfe ob Template existiert
        if (!fs.existsSync('dashboard-template.html')) {
            console.error('❌ dashboard-template.html nicht gefunden!');
            return null;
        }
        
        let template = fs.readFileSync('dashboard-template.html', 'utf8');
        console.log('📄 Template geladen, Länge:', template.length);
        
        // Gesamtsummen ersetzen
        const gesamtErgebnis = data.gesamtEinnahmen - data.gesamtAusgaben;
        template = template.replace('{{GESAMT_EINNAHMEN}}', formatNumber(data.gesamtEinnahmen));
        template = template.replace('{{GESAMT_AUSGABEN}}', formatNumber(data.gesamtAusgaben));
        template = template.replace('{{AKTUELLES_ERGEBNIS}}', formatNumber(gesamtErgebnis));
        template = template.replace('{{RESULT_CLASS}}', gesamtErgebnis >= 0 ? 'result-positive' : 'result-negative');
        
        // Kontostand-Vergleichswerte
        console.log('🔧 Setze Kontostand-Vergleichswerte...');
        console.log('2024 Q1 (März):', data.kontostand2024[2]);
        console.log('2024 Q2 (Juni):', data.kontostand2024[5]);
        console.log('2025 Q1 (März):', data.kontostand[2]);
        console.log('2025 Q2 (Juni):', data.kontostand[5]);
        
        template = template.replace('{{KONTOSTAND_2024_Q1}}', formatNumber(data.kontostand2024[2])); // März 2024
        template = template.replace('{{KONTOSTAND_2024_Q2}}', formatNumber(data.kontostand2024[5])); // Juni 2024
        template = template.replace('{{KONTOSTAND_2025_Q1}}', formatNumber(data.kontostand[2])); // März 2025
        template = template.replace('{{KONTOSTAND_2025_Q2}}', formatNumber(data.kontostand[5])); // Juni 2025
        
        // Differenzen berechnen
        const diffQ1 = data.kontostand[2] - data.kontostand2024[2];
        const diffQ2 = data.kontostand[5] - data.kontostand2024[5];
        
        console.log('Differenz Q1:', diffQ1);
        console.log('Differenz Q2:', diffQ2);
        
        template = template.replace('{{DIFF_Q1}}', formatNumber(Math.abs(diffQ1)));
        template = template.replace('{{DIFF_Q2}}', formatNumber(Math.abs(diffQ2)));
        template = template.replace('{{DIFF_Q1_CLASS}}', diffQ1 >= 0 ? 'positive' : 'negative');
        template = template.replace('{{DIFF_Q2_CLASS}}', diffQ2 >= 0 ? 'positive' : 'negative');
        template = template.replace('{{DIFF_Q1_SIGN}}', diffQ1 >= 0 ? '+' : '-');
        template = template.replace('{{DIFF_Q2_SIGN}}', diffQ2 >= 0 ? '+' : '-');
        
        // Quartale generieren (ohne Kontostand)
        let quartersHTML = '';
        quarters.forEach(quarter => {
            if (quarter.hasData) {
                quartersHTML += `
                <div class="quarter-card" onclick="flipCard(this)">
                    <div class="card-inner">
                        <div class="card-front">
                            <div class="quarter-name">${quarter.name}</div>
                            <div class="quarter-period">${quarter.period}</div>
                            <div class="quarter-status ${quarter.kumuliert >= 0 ? 'status-positive' : 'status-negative'}">Kumuliert: ${formatNumber(quarter.kumuliert)}€</div>
                            <div class="flip-hint">Klicken für Details</div>
                        </div>
                        <div class="card-back">
                            <div class="card-details">
                                <div class="detail-row"><span class="detail-label">Einnahmen:</span> <span class="detail-value detail-positive">${formatNumber(quarter.einnahmen)}€</span></div>
                                <div class="detail-row"><span class="detail-label">Ausgaben:</span> <span class="detail-value detail-negative">${formatNumber(quarter.ausgaben)}€</span></div>
                                <div class="detail-row"><span class="detail-label">Quartalsergebnis:</span> <span class="detail-value ${quarter.ergebnis >= 0 ? 'detail-positive' : 'detail-negative'}">${formatNumber(quarter.ergebnis)}€</span></div>
                            </div>
                        </div>
                    </div>
                </div>`;
            } else {
                quartersHTML += `
                <div class="quarter-card" onclick="flipCard(this)">
                    <div class="card-inner">
                        <div class="card-front">
                            <div class="quarter-name">${quarter.name}</div>
                            <div class="quarter-period">${quarter.period}</div>
                            <div class="quarter-status">Keine Daten</div>
                            <div class="flip-hint">Klicken für Details</div>
                        </div>
                        <div class="card-back">
                            <div class="card-details">
                                <div class="detail-row"><span class="detail-label">Einnahmen:</span> <span class="detail-value">Keine Daten</span></div>
                                <div class="detail-row"><span class="detail-label">Ausgaben:</span> <span class="detail-value">Keine Daten</span></div>
                                <div class="detail-row"><span class="detail-label">Quartalsergebnis:</span> <span class="detail-value">Keine Daten</span></div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
        });
        
        template = template.replace('{{QUARTERS}}', quartersHTML);
        
        console.log('✅ HTML generiert, Länge:', template.length);
        return template;
    } catch (error) {
        console.error('❌ Fehler beim Generieren des HTML:', error);
        return null;
    }
}

// Zahlen formatieren
function formatNumber(num) {
    if (num === 0) return '0';
    return new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(num));
}

// Hauptfunktion
function main() {
    console.log('🚀 Dashboard Update gestartet...');
    console.log('📂 Arbeitsverzeichnis:', process.cwd());
    console.log('📁 Dateien im Verzeichnis:', fs.readdirSync('.'));
    
    const csvData = readCSV();
    if (!csvData) {
        console.error('❌ Fehler beim Lesen der CSV-Datei');
        process.exit(1);
    }
    
    const data = extractData(csvData);
    if (!data) {
        console.error('❌ Fehler beim Extrahieren der Daten');
        process.exit(1);
    }
    
    const quarters = calculateQuarters(data);
    const html = generateHTML(data, quarters);
    
    if (!html) {
        console.error('❌ Fehler beim Generieren des HTML');
        process.exit(1);
    }
    
    try {
        // index.html schreiben
        fs.writeFileSync('index.html', html, 'utf8');
        console.log('✅ index.html erfolgreich erstellt!');
        
        // Prüfen ob Datei existiert
        if (fs.existsSync('index.html')) {
            const stats = fs.statSync('index.html');
            console.log('📄 index.html Größe:', stats.size, 'Bytes');
        }
        
        console.log('🎉 Dashboard erfolgreich aktualisiert!');
        console.log(`📊 Gesamtergebnis: ${formatNumber(data.gesamtEinnahmen - data.gesamtAusgaben)}€`);
    } catch (error) {
        console.error('❌ Fehler beim Schreiben der index.html:', error);
        process.exit(1);
    }
}

// Script ausführen
if (require.main === module) {
    main();
}
