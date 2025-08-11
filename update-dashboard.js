// update-dashboard.js
const fs = require('fs');
const Papa = require('papaparse');

// CSV Datei lesen
function readCSV() {
    try {
        console.log('📖 Lese CSV-Datei...');
        const csvData = fs.readFileSync('zahlen_aktuell.csv', 'utf8');
        console.log('✅ CSV erfolgreich gelesen');
        console.log('CSV Inhalt (erste 200 Zeichen):', csvData.substring(0, 200));
        
        const parsed = Papa.parse(csvData, {
            header: false,
            delimiter: ';',
            skipEmptyLines: true
        });
        
        console.log('📊 Parsed Daten:', parsed.data.length, 'Zeilen');
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
    const data = {};
    
    try {
        // Monate finden - nehme die ersten 6 Spalten nach der ersten
        const months = 6;
        
        // Einnahmen (Zeile 0)
        const einnahmenRow = csvData[0] || [];
        console.log('💰 Einnahmen Zeile:', einnahmenRow);
        data.einnahmen = [];
        for (let i = 1; i <= months; i++) {
            data.einnahmen.push(parseGermanNumber(einnahmenRow[i]));
        }
        
        // Ausgaben (Zeile 1)
        const ausgabenRow = csvData[1] || [];
        console.log('💸 Ausgaben Zeile:', ausgabenRow);
        data.ausgaben = [];
        for (let i = 1; i <= months; i++) {
            data.ausgaben.push(parseGermanNumber(ausgabenRow[i]));
        }
        
        // Kumuliert finden (suche nach "Kumuliert" in der ersten Spalte)
        let kumuliertRowIndex = -1;
        for (let i = 0; i < csvData.length; i++) {
            if (csvData[i][0] && csvData[i][0].toString().includes('Kumuliert')) {
                kumuliertRowIndex = i;
                break;
            }
        }
        
        data.kumuliert = [];
        if (kumuliertRowIndex >= 0) {
            const kumuliertRow = csvData[kumuliertRowIndex];
            console.log('📈 Kumuliert Zeile:', kumuliertRow);
            for (let i = 1; i <= months; i++) {
                data.kumuliert.push(parseGermanNumber(kumuliertRow[i]));
            }
        } else {
            // Fallback: Kumuliert selbst berechnen
            console.log('⚠️ Kumuliert-Zeile nicht gefunden, berechne selbst...');
            let cumulative = 0;
            for (let i = 0; i < months; i++) {
                cumulative += (data.einnahmen[i] - data.ausgaben[i]);
                data.kumuliert.push(cumulative);
            }
        }
        
        // Kontostand finden
        let kontostandRowIndex = -1;
        for (let i = 0; i < csvData.length; i++) {
            if (csvData[i][0] && csvData[i][0].toString().includes('Kontostand')) {
                kontostandRowIndex = i;
                break;
            }
        }
        
        data.kontostand = [];
        if (kontostandRowIndex >= 0) {
            const kontostandRow = csvData[kontostandRowIndex];
            console.log('🏦 Kontostand Zeile:', kontostandRow);
            for (let i = 1; i <= months; i++) {
                data.kontostand.push(parseGermanNumber(kontostandRow[i]));
            }
        } else {
            // Fallback: Dummy-Werte
            console.log('⚠️ Kontostand-Zeile nicht gefunden, setze Standard-Werte...');
            for (let i = 0; i < months; i++) {
                data.kontostand.push(50000 - (i * 1000)); // Dummy-Werte
            }
        }
        
        // Gesamtsummen berechnen
        data.gesamtEinnahmen = data.einnahmen.reduce((a, b) => a + b, 0);
        data.gesamtAusgaben = data.ausgaben.reduce((a, b) => a + b, 0);
        
        console.log('✅ Daten extrahiert:');
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
        
        // Quartale generieren
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
                                <div class="detail-row"><span class="detail-label">Kontostand 2025:</span> <span class="detail-value">${formatNumber(quarter.kontostand)}€</span></div>
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
                                <div class="detail-row"><span class="detail-label">Kontostand 2025:</span> <span class="detail-value">Keine Daten</span></div>
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
