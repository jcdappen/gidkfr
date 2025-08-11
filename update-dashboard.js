// update-dashboard.js
const fs = require('fs');
const Papa = require('papaparse');

// CSV Datei lesen
function readCSV() {
    try {
        const csvData = fs.readFileSync('zahlen_aktuell.csv', 'utf8');
        const parsed = Papa.parse(csvData, {
            header: false,
            delimiter: ';',
            skipEmptyLines: true
        });
        return parsed.data;
    } catch (error) {
        console.error('Fehler beim Lesen der CSV:', error);
        return null;
    }
}

// Daten extrahieren und bereinigen
function extractData(csvData) {
    const data = {};
    
    // Monate finden
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni'];
    
    // Einnahmen (Zeile 1)
    const einnahmenRow = csvData[0];
    data.einnahmen = months.map((month, i) => parseGermanNumber(einnahmenRow[i + 1]));
    
    // Ausgaben (Zeile 2)
    const ausgabenRow = csvData[1];
    data.ausgaben = months.map((month, i) => parseGermanNumber(ausgabenRow[i + 1]));
    
    // Kumuliert (Zeile 4)
    const kumuliertRow = csvData[4];
    data.kumuliert = months.map((month, i) => parseGermanNumber(kumuliertRow[i + 1]));
    
    // Kontostand (Zeile 6)
    const kontostandRow = csvData[6];
    data.kontostand = months.map((month, i) => parseGermanNumber(kontostandRow[i + 1]));
    
    // Kumulierte Summen (letzte Zeilen)
    data.gesamtEinnahmen = parseGermanNumber(csvData[9][1]);
    data.gesamtAusgaben = parseGermanNumber(csvData[10][1]);
    
    return data;
}

// Deutsche Zahlenformate in Numbers umwandeln
function parseGermanNumber(str) {
    if (!str || str === '' || str.includes('Keine Daten')) return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.').replace('€', '').trim());
}

// Quartale berechnen
function calculateQuarters(data) {
    const quarters = [];
    
    // Q1 (Jan-Mar)
    const q1Einnahmen = data.einnahmen.slice(0, 3).reduce((a, b) => a + b, 0);
    const q1Ausgaben = data.ausgaben.slice(0, 3).reduce((a, b) => a + b, 0);
    quarters.push({
        name: 'Q1 2025',
        period: 'Januar - März',
        einnahmen: q1Einnahmen,
        ausgaben: q1Ausgaben,
        ergebnis: q1Einnahmen - q1Ausgaben,
        kumuliert: data.kumuliert[2], // März
        kontostand: data.kontostand[2], // März
        hasData: true
    });
    
    // Q2 (Apr-Jun)
    const q2Einnahmen = data.einnahmen.slice(3, 6).reduce((a, b) => a + b, 0);
    const q2Ausgaben = data.ausgaben.slice(3, 6).reduce((a, b) => a + b, 0);
    quarters.push({
        name: 'Q2 2025',
        period: 'April - Juni',
        einnahmen: q2Einnahmen,
        ausgaben: q2Ausgaben,
        ergebnis: q2Einnahmen - q2Ausgaben,
        kumuliert: data.kumuliert[5], // Juni
        kontostand: data.kontostand[5], // Juni
        hasData: true
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
    
    return quarters;
}

// HTML Template laden und Daten einsetzen
function generateHTML(data, quarters) {
    let template = fs.readFileSync('dashboard-template.html', 'utf8');
    
    // Gesamtsummen ersetzen
    template = template.replace('{{GESAMT_EINNAHMEN}}', formatNumber(data.gesamtEinnahmen));
    template = template.replace('{{GESAMT_AUSGABEN}}', formatNumber(data.gesamtAusgaben));
    template = template.replace('{{AKTUELLES_ERGEBNIS}}', formatNumber(data.gesamtEinnahmen - data.gesamtAusgaben));
    template = template.replace('{{RESULT_CLASS}}', (data.gesamtEinnahmen - data.gesamtAusgaben) >= 0 ? 'result-positive' : 'result-negative');
    
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
    
    return template;
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
    console.log('🚀 Dashboard wird aktualisiert...');
    
    const csvData = readCSV();
    if (!csvData) {
        console.error('❌ Fehler beim Lesen der CSV-Datei');
        return;
    }
    
    const data = extractData(csvData);
    const quarters = calculateQuarters(data);
    const html = generateHTML(data, quarters);
    
    // index.html schreiben
    fs.writeFileSync('index.html', html, 'utf8');
    
    console.log('✅ Dashboard erfolgreich aktualisiert!');
    console.log(`📊 Gesamtergebnis: ${formatNumber(data.gesamtEinnahmen - data.gesamtAusgaben)}€`);
}

// Script ausführen
main();
