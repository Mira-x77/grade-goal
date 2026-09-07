import * as pdfjsLib from 'pdfjs-dist';
import { ClassLevel, ExamType, Session, AcademicSystem } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface AutoCategoryResult {
  title: string;
  classLevel: ClassLevel | '';
  subject: string;
  year: number;
  examType: ExamType | '';
  session: Session | '';
  system: AcademicSystem | '';
  confidence: number;
}

export async function extractTextFromPDF(file: File, maxPages = 3): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const pagesToExtract = Math.min(maxPages, pdf.numPages);
    
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + ' \n';
    }
    
    return fullText;
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    return '';
  }
}

export async function autoCategorizeFile(file: File): Promise<AutoCategoryResult> {
  const filename = file.name.toUpperCase();
  const text = (await extractTextFromPDF(file)).toUpperCase();
  
  const result: AutoCategoryResult = {
    title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '),
    classLevel: '',
    subject: '',
    year: new Date().getFullYear(),
    examType: '',
    session: '',
    system: 'apc',
    confidence: 0
  };

  let points = 0;

  // 1. Detect BEPC / Exam Type
  const isBepc = filename.includes('BEPC') || text.includes('BEPC');
  if (isBepc) {
    result.examType = 'BEPC';
    result.classLevel = '3ème';
    points += 2;
  } else {
    // Other exam types
    if (filename.includes('BAC') || text.includes('BACCALAUREAT') || text.includes('BACCALAURÉAT')) {
      result.examType = 'Baccalauréat';
      points += 1;
    } else if (filename.includes('PROBATOIRE') || text.includes('PROBATOIRE')) {
      result.examType = 'Probatoire';
      points += 1;
    } else if (filename.match(/DEVOIR|EVALUATION|ÉVALUATION/) || text.match(/DEVOIR|EVALUATION|ÉVALUATION/)) {
      result.examType = 'Devoir';
      points += 1;
    } else if (filename.includes('COMPO') || text.includes('COMPOSITION')) {
      result.examType = 'Composition';
      points += 1;
    } else {
      result.examType = 'Practice'; // Default
    }
  }

  // 2. Detect Year
  const yearMatch = filename.match(/(202[0-9])(?:-(20[2-9][0-9]))?/) || text.match(/(202[0-9])(?:-(20[2-9][0-9]))?/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[2] || yearMatch[1], 10);
    points += 1;
  }

  // 3. Detect Class Level (if not already set by BEPC)
  if (!result.classLevel) {
    const classMatch = filename.match(/(3[EÈ]ME|3[EÈ]|TROISI[EÈ]ME|4[EÈ]ME|4[EÈ]|QUATRI[EÈ]ME|5[EÈ]ME|5[EÈ]|CINQUI[EÈ]ME|6[EÈ]ME|6[EÈ]|SIXI[EÈ]ME|2NDE|SECONDE|1[EÈ]RE|PREMI[EÈ]RE|TLE|TERMINALE)/) 
                    || text.match(/(3[EÈ]ME|3[EÈ]|TROISI[EÈ]ME|4[EÈ]ME|4[EÈ]|QUATRI[EÈ]ME|5[EÈ]ME|5[EÈ]|CINQUI[EÈ]ME|6[EÈ]ME|6[EÈ]|SIXI[EÈ]ME|2NDE|SECONDE|1[EÈ]RE|PREMI[EÈ]RE|TLE|TERMINALE)/);
    
    if (classMatch) {
      const cls = classMatch[1].replace('È', 'E');
      if (cls.startsWith('3') || cls.startsWith('TROIS')) result.classLevel = '3ème';
      else if (cls.startsWith('4') || cls.startsWith('QUATR')) result.classLevel = '4ème';
      else if (cls.startsWith('5') || cls.startsWith('CINQ')) result.classLevel = '5ème';
      else if (cls.startsWith('6') || cls.startsWith('SIX')) result.classLevel = '6ème';
      else if (cls.startsWith('2') || cls.startsWith('SEC')) result.classLevel = '2nde';
      else if (cls.startsWith('1') || cls.startsWith('PREM')) result.classLevel = '1ère';
      else if (cls.startsWith('T')) result.classLevel = 'Tle';
      points += 1;
    }
  }

  // Detect Series if Lycée
  if (result.classLevel === '1ère' || result.classLevel === 'Tle') {
    const seriesMatch = filename.match(/\b(A4|CD|[CDEFG])\b/) || text.match(/SERIE\s*(A4|CD|[CDEFG])|SÉRIE\s*(A4|CD|[CDEFG])/);
    if (seriesMatch) {
      const series = seriesMatch[1] || seriesMatch[2];
      result.classLevel = `${result.classLevel} ${series}` as ClassLevel;
    }
  } else if (result.classLevel === '2nde') {
    const seriesMatch = filename.match(/\b(A4|CD|[EFG])\b/) || text.match(/SERIE\s*(A4|CD|[EFG])|SÉRIE\s*(A4|CD|[EFG])/);
    if (seriesMatch) {
      const series = seriesMatch[1] || seriesMatch[2];
      result.classLevel = `${result.classLevel} ${series}` as ClassLevel;
    }
  }

  // 4. Detect Subject
  const subjects = {
    "Mathématiques": ["MATHS", "MATHEMATIQUES", "MATHÉMATIQUES", "MATH"],
    "SVT": ["SVT", "SCIENCES DE LA VIE", "SCIENCES NATURELLES"],
    "PCT": ["PCT", "SCIENCES PHYSIQUES", "PHYSIQUE", "CHIMIE"],
    "Français": ["FRANCAIS", "FRANÇAIS", "LECTURE", "ORTHOGRAPHE", "GRAMMAIRE"],
    "Anglais": ["ANGLAIS", "ENGLISH"],
    "Histoire": ["HISTOIRE"],
    "Géographie": ["GEOGRAPHIE", "GÉOGRAPHIE"],
    "ECM": ["ECM", "EDUCATION CIVIQUE", "ÉDUCATION CIVIQUE", "EDHC"],
    "Philosophie": ["PHILOSOPHIE", "PHILO"],
    "Informatique": ["INFORMATIQUE", "INFO"]
  };
  
  for (const [subj, keywords] of Object.entries(subjects)) {
    if (keywords.some(kw => filename.includes(kw))) {
      result.subject = subj;
      points += 2;
      break;
    }
  }
  if (!result.subject) {
    for (const [subj, keywords] of Object.entries(subjects)) {
      if (keywords.some(kw => text.includes(kw))) {
        result.subject = subj;
        points += 1;
        break;
      }
    }
  }

  // 5. Detect Session
  if (filename.includes('1ER TRIM') || filename.includes('TRIM 1') || text.includes('1ER TRIM') || text.includes('TRIMESTRE 1')) {
    result.session = '1er Trimestre';
    points += 1;
  } else if (filename.includes('2EME TRIM') || filename.includes('TRIM 2') || text.includes('2EME TRIM') || text.includes('TRIMESTRE 2')) {
    result.session = '2ème Trimestre';
    points += 1;
  } else if (filename.includes('3EME TRIM') || filename.includes('TRIM 3') || text.includes('3EME TRIM') || text.includes('TRIMESTRE 3')) {
    result.session = '3ème Trimestre';
    points += 1;
  } else if (filename.includes('ANNUEL') || filename.includes('ANNUAL') || text.includes('ANNUEL')) {
    result.session = 'Annuel';
    points += 1;
  } else {
    // Guess based on month mentions
    if (text.match(/JANVIER|FEVRIER|FÉVRIER|MARS/)) result.session = '2ème Trimestre';
    else if (text.match(/OCTOBRE|NOVEMBRE|DECEMBRE|DÉCEMBRE/)) result.session = '1er Trimestre';
    else if (text.match(/AVRIL|MAI|JUIN/)) result.session = '3ème Trimestre';
    else result.session = 'Regular';
  }

  // Confidence scale 0 to 100
  result.confidence = Math.min(100, Math.round((points / 6) * 100));

  return result;
}
