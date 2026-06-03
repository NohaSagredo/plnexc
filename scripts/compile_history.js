const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'Archivos extra', 'workouts.csv');
const outputPath = path.join(__dirname, '..', 'src', 'data', 'workout_history.json');

function parseCSV() {
  console.log('Reading CSV from:', csvPath);
  if (!fs.existsSync(csvPath)) {
    console.error('workouts.csv not found!');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split(/\r?\n/);
  
  if (lines.length === 0) {
    console.error('CSV is empty');
    process.exit(1);
  }

  // Parse header
  // "title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
  const headerLine = lines[0];
  const columns = headerLine.replace(/"/g, '').split(',');
  
  console.log('Detected CSV Columns:', columns);

  const workoutsMap = new Map(); // Key: title + start_time
  let totalSetsParsed = 0;

  // Simple CSV line parser that respects quoted commas
  function parseCSVLine(text) {
    const result = [];
    let curVal = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(curVal.trim());
        curVal = '';
      } else {
        curVal += char;
      }
    }
    result.push(curVal.trim());
    return result;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    if (parts.length < 5) continue;

    // Map column values
    const title = parts[0] || 'Entrenamiento Sin Nombre';
    const startTime = parts[1] || '';
    const endTime = parts[2] || '';
    const description = parts[3] || '';
    const exerciseTitle = parts[4] || '';
    const supersetId = parts[5] || '';
    const exerciseNotes = parts[6] || '';
    const setIndex = parseInt(parts[7], 10) || 0;
    const setType = parts[8] || 'normal';
    
    const weightKg = parts[9] ? parseFloat(parts[9]) : null;
    const reps = parts[10] ? parseInt(parts[10], 10) : null;
    const distanceKm = parts[11] ? parseFloat(parts[11]) : null;
    const durationSeconds = parts[12] ? parseInt(parts[12], 10) : null;
    const rpe = parts[13] ? parseFloat(parts[13]) : null;

    if (!exerciseTitle) continue;

    // Unique session key
    const sessionKey = `${title}__${startTime}`;

    if (!workoutsMap.has(sessionKey)) {
      workoutsMap.set(sessionKey, {
        title,
        startTime,
        endTime,
        description,
        exercises: []
      });
    }

    const session = workoutsMap.get(sessionKey);
    
    // Find or create exercise entry in this session
    let exerciseEntry = session.exercises.find(e => e.title === exerciseTitle);
    if (!exerciseEntry) {
      exerciseEntry = {
        title: exerciseTitle,
        supersetId: supersetId || null,
        notes: exerciseNotes || '',
        sets: []
      };
      session.exercises.push(exerciseEntry);
    }

    // Add set
    exerciseEntry.sets.push({
      setIndex,
      setType,
      weightKg,
      reps,
      distanceKm,
      durationSeconds,
      rpe
    });
    
    totalSetsParsed++;
  }

  console.log(`Parsed ${totalSetsParsed} sets across ${workoutsMap.size} unique workout sessions.`);

  // Convert map to array and sort by startTime descending
  const sessions = Array.from(workoutsMap.values());
  
  // Helper to parse date strings (e.g. "23 may 2026, 19:36")
  // Format is "D mmm YYYY, HH:MM"
  const months = {
    jan: 0, ene: 0, feb: 1, mar: 2, apr: 3, abr: 3, may: 4, jun: 5, jul: 6, aug: 7, ago: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11, dic: 11
  };
  
  function parseWorkoutDate(dateStr) {
    if (!dateStr) return new Date(0);
    try {
      const cleaned = dateStr.toLowerCase().replace(/,/g, '').trim();
      const parts = cleaned.split(/\s+/); // [ '23', 'may', '2026', '19:36' ]
      if (parts.length >= 4) {
        const day = parseInt(parts[0], 10);
        const monthName = parts[1].substring(0, 3);
        const month = months[monthName] !== undefined ? months[monthName] : 0;
        const year = parseInt(parts[2], 10);
        const timeParts = parts[3].split(':');
        const hour = parseInt(timeParts[0], 10);
        const min = parseInt(timeParts[1], 10);
        return new Date(year, month, day, hour, min);
      }
    } catch (e) {
      // fallback
    }
    return new Date(dateStr);
  }

  sessions.forEach(session => {
    session.parsedDate = parseWorkoutDate(session.startTime).toISOString();
    
    // Sort sets by setIndex just in case
    session.exercises.forEach(exercise => {
      exercise.sets.sort((a, b) => a.setIndex - b.setIndex);
      
      // Calculate 1RM Max and Volume
      let maxEst1RM = 0;
      let totalVolume = 0;
      exercise.sets.forEach(set => {
        if (set.weightKg && set.reps) {
          totalVolume += set.weightKg * set.reps;
          // Epley formula
          const est1RM = set.weightKg * (1 + set.reps / 30);
          if (est1RM > maxEst1RM) {
            maxEst1RM = parseFloat(est1RM.toFixed(2));
          }
        }
      });
      if (maxEst1RM > 0) {
        exercise.maxEst1RM = maxEst1RM;
      }
      exercise.totalVolume = totalVolume;
    });
  });

  // Sort sessions chronologically (newest first)
  sessions.sort((a, b) => new Date(b.parsedDate) - new Date(a.parsedDate));

  // Write output
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(sessions, null, 2), 'utf-8');
  console.log('Successfully wrote compiled history to:', outputPath);
}

parseCSV();
