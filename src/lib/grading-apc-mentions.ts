/**
 * APC Mentions (Togolese Grading System)
 * 
 * Source: Togolese education system introduced "Excellent" mention
 * Reference: https://gpacalculator.net/grade-conversion/togo/
 * 
 * Based on 0-20 scale commonly used in French-speaking African countries
 */

export interface APCMention {
  code: string;
  label: string;
  color: "success" | "primary" | "secondary" | "warning" | "danger" | "muted";
}

/**
 * Get APC mention based on average (0-20 scale)
 * 
 * Togo grading mentions:
 * - 16-20: Excellent (newly introduced by Ministry of Education)
 * - 14-15.9: Très Bien (Very Good)
 * - 12-13.9: Bien (Good)
 * - 10-11.9: Passable (Satisfactory - passing grade)
 * - 0-9.9: Insuffisant (Unsatisfactory - failing)
 */
export function getAPCMention(average: number): APCMention {
  if (average >= 16) {
    return {
      code: "EX",
      label: "Excellent",
      color: "success",
    };
  }
  
  if (average >= 14) {
    return {
      code: "TB",
      label: "Très Bien",
      color: "primary",
    };
  }
  
  if (average >= 12) {
    return {
      code: "B",
      label: "Bien",
      color: "secondary",
    };
  }
  
  if (average >= 10) {
    return {
      code: "P",
      label: "Passable",
      color: "warning",
    };
  }
  
  return {
    code: "I",
    label: "Insuffisant",
    color: "danger",
  };
}

/**
 * Get mention color for UI styling
 */
export function getMentionColor(mention: APCMention): string {
  const colorMap = {
    success: "text-success",
    primary: "text-primary",
    secondary: "text-secondary",
    warning: "text-warning",
    danger: "text-danger",
    muted: "text-muted-foreground",
  };
  
  return colorMap[mention.color] ?? colorMap.muted;
}

/**
 * Get all mentions for reference/legend
 */
export function getAllAPCMentions(): APCMention[] {
  return [
    { code: "EX", label: "Excellent", color: "success" },
    { code: "TB", label: "Très Bien", color: "primary" },
    { code: "B", label: "Bien", color: "secondary" },
    { code: "P", label: "Passable", color: "warning" },
    { code: "I", label: "Insuffisant", color: "danger" },
  ];
}
