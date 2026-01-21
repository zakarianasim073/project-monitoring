
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectState, ExtractedDPR, ExtractedBill, BOQItem, AiSuggestion, CostBreakdown, DocumentCategory, ModuleType } from "../types";

// Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) inside functions for fresh instance
export const generateProjectInsights = async (projectData: ProjectState): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Calculate pending work high level stats
  const pendingItems = projectData.boq.filter(i => i.executedQty < i.plannedQty && i.priority === 'HIGH');
  
  const prompt = `
    Analyze the following construction project and provide a "Key Points & Progress Pending" report.
    
    Project Name: ${projectData.name}
    Contract Value: ${projectData.contractValue}
    
    Milestones:
    ${projectData.milestones.map(m => `- ${m.title} (${m.date}): ${m.status}`).join('\n')}

    Critical Pending BOQ Items (High Priority & Incomplete):
    ${pendingItems.slice(0, 5).map(i => `- ${i.description}: ${(i.executedQty/i.plannedQty*100).toFixed(1)}% complete. Remaining: ${i.plannedQty - i.executedQty} ${i.unit}`).join('\n')}
    
    Financials:
    - Bills: ${projectData.bills.length} records
    - Liabilities: ${projectData.liabilities.length} records.
    
    Please provide an executive summary formatted in Markdown with these sections:
    1. **Project Health**: Score (0-100%) and brief status.
    2. **Critical Pending Actions**: Identify the top 3 most urgent tasks based on High Priority BOQ items that are behind schedule.
    3. **Milestone Risk**: Comment on upcoming milestones and if the current rate of progress puts them at risk.
    4. **Recommendation**: One strategic move for the Project Director.

    Keep it professional, concise, and action-oriented.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Error generating insights:", error);
    return "Failed to generate insights. Please check API configuration.";
  }
};

/**
 * Deep Analysis of a Document to find actionable updates
 */
export const analyzeDocumentContent = async (
  docName: string, 
  category: string,
  boqItems: BOQItem[]
): Promise<AiSuggestion[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Logic: If it's a Report, try to extract full DPR data to suggest adding it directly
  let specificPrompt = "";
  let responseSchemaType = Type.ARRAY; // Default array of suggestions

  if (category === 'REPORT') {
     // Specialized prompt for Reports to generate a DPR_ENTRY suggestion
     specificPrompt = `
        The document is a Site Report. 
        Extract the daily progress details and create a "DPR_ENTRY" suggestion.
        The "value" field of the suggestion must be a JSON object containing: date, activity, location, laborCount, remarks, workDoneQty, linkedBoqId, subContractorName, and materials (array of {name, qty}).
     `;
  } else if (category === 'BILL') {
     specificPrompt = `
        The document is a Bill/Invoice.
        Extract financial details and create a "BILL_DETECTION" suggestion.
     `;
  }

  const prompt = `
    You are an AI Site Engineer. Analyze the document named "${docName}" (Category: ${category}).
    ${specificPrompt}
    
    Available BOQ Items to link:
    ${boqItems.map(b => `- ID: ${b.id}, Desc: ${b.description}`).join('\n')}
    
    Rules:
    1. If category is "REPORT", create a suggestion with type "DPR_ENTRY".
    2. If category is "BILL", create a suggestion with type "BILL_DETECTION".
    3. If there is a risk mentioned (simulated), create a "RISK_ALERT".
    4. "QUANTITY_UPDATE" is for simple updates.
    
    Return a JSON array of suggestions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              value: { 
                  type: Type.OBJECT, // Generic object to hold structured data
                  description: "For DPR: { date, activity, materials: [{name, qty}], ... }. For Bill: amount number."
              }, 
              linkedId: { type: Type.STRING, description: 'BOQ Item ID if applicable' }
            },
            required: ["type", "title", "description"]
          }
        }
      }
    });

    const results = JSON.parse(response.text || "[]");
    return results.map((r: any) => ({
      ...r,
      id: `SUG-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      status: 'PENDING'
    }));
  } catch (error) {
    console.error("Deep analysis error:", error);
    return [];
  }
};

/**
 * AI logic to suggest planned unit cost and logical breakdown
 */
export const suggestPlannedUnitCost = async (
  description: string,
  unit: string,
  existingBOQ: BOQItem[]
): Promise<{ total: number; breakdown: CostBreakdown } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Based on the following existing BOQ items in a construction project, suggest a realistic "Planned Unit Cost" (internal budgeted cost) and its breakdown for a new item.
    
    New Item Description: "${description}"
    New Item Unit: "${unit}"
    
    Existing Items (for context and price benchmarking):
    ${existingBOQ.slice(0, 15).map(item => `- ${item.description} (${item.unit}): Planned Cost ৳${item.plannedUnitCost}`).join('\n')}
    
    Return a JSON object with:
    1. "total": The total estimated internal budgeted unit cost.
    2. "breakdown": { "material": number, "labor": number, "equipment": number, "overhead": number }
    The sum of breakdown components must equal the total.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            total: { type: Type.NUMBER },
            breakdown: {
              type: Type.OBJECT,
              properties: {
                material: { type: Type.NUMBER },
                labor: { type: Type.NUMBER },
                equipment: { type: Type.NUMBER },
                overhead: { type: Type.NUMBER }
              },
              required: ["material", "labor", "equipment", "overhead"]
            }
          },
          required: ["total", "breakdown"]
        }
      }
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Cost Suggestion error:", error);
    return null;
  }
};

/**
 * AI logic to decompose a total actual cost into logical components
 */
export const suggestActualCostBreakdown = async (
  description: string,
  actualUnitCost: number,
  plannedBreakdown?: CostBreakdown
): Promise<CostBreakdown | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze this construction item: "${description}".
    Total Actual Unit Cost: ৳${actualUnitCost}.
    
    Planned Breakdown (if available for context): 
    Material: ৳${plannedBreakdown?.material || 'N/A'}, 
    Labor: ৳${plannedBreakdown?.labor || 'N/A'}, 
    Equipment: ৳${plannedBreakdown?.equipment || 'N/A'}, 
    Overhead: ৳${plannedBreakdown?.overhead || 'N/A'}.

    Decompose the Total Actual Unit Cost (৳${actualUnitCost}) into Material, Labor, Equipment, and Overhead based on industry standards for this type of work.
    The SUM of these four components MUST equal EXACTLY ${actualUnitCost}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            material: { type: Type.NUMBER },
            labor: { type: Type.NUMBER },
            equipment: { type: Type.NUMBER },
            overhead: { type: Type.NUMBER }
          },
          required: ["material", "labor", "equipment", "overhead"]
        }
      }
    });

    const breakdown = JSON.parse(response.text || "{}");
    return breakdown as CostBreakdown;
  } catch (error) {
    console.error("Actual Breakdown Suggestion error:", error);
    return null;
  }
};

/**
 * AI logic to suggest category and module based on file name
 */
export const suggestDocumentMetadata = async (fileName: string, userRole: string): Promise<{ category: DocumentCategory; module: ModuleType } | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Analyze the construction document file name: "${fileName}".
    The uploader's role is: "${userRole}".
    
    Predict the most appropriate DocumentCategory and ModuleType.
    
    Categories: CONTRACT, DRAWING, PERMIT, REPORT, BILL, OTHER
    Modules: MASTER, SITE, FINANCE, LIABILITY, GENERAL
    
    Return a JSON object.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            module: { type: Type.STRING }
          },
          required: ["category", "module"]
        }
      }
    });

    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Metadata Suggestion error:", error);
    return null;
  }
};

export const extractDPRData = async (docName: string, boqItems: BOQItem[]): Promise<ExtractedDPR | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a construction AI agent. Analyze the site report document name: "${docName}".
    Your task is to extract or intelligently simulate the Daily Progress Report (DPR) data that would be contained in a document with this title.
    
    Available BOQ Items to potentially link work to:
    ${boqItems.map(b => `- ${b.id}: ${b.description}`).join('\n')}
    
    Extraction Targets:
    1. Date (YYYY-MM-DD)
    2. Activity description
    3. Work Done Quantity (workDoneQty)
    4. Sub-contractor Name (if identifiable in text like "Work by Sweet Chairman")
    5. Material usage: Extract structured list of materials and quantities consumed (e.g. "50 bags Cement" -> name: Cement, qty: 50).
    
    Return JSON with fields: date, activity, location, laborCount, remarks, workDoneQty, linkedBoqId, subContractorName, materials (array of objects with name and qty).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            activity: { type: Type.STRING },
            location: { type: Type.STRING },
            laborCount: { type: Type.NUMBER },
            remarks: { type: Type.STRING },
            workDoneQty: { type: Type.NUMBER },
            linkedBoqId: { type: Type.STRING },
            subContractorName: { type: Type.STRING, description: 'Simulated sub-contractor name if relevant to work type' },
            materials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  qty: { type: Type.NUMBER }
                },
                required: ["name", "qty"]
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("DPR Extraction error:", error);
    return null;
  }
};

export const extractBillData = async (docName: string): Promise<ExtractedBill | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Analyze bill document name: "${docName}".
    Extract financial details like vendor/client name, amount, and date.
    Return JSON with fields: entityName, amount, date, type ('CLIENT_RA' or 'VENDOR_INVOICE').
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            entityName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            type: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Bill Extraction error:", error);
    return null;
  }
};

export const parseRunningBillDetails = async (docName: string, boqItems: BOQItem[]): Promise<{ boqId: string; amount: number }[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a Quantity Surveyor. Analyze the Running Bill document named "${docName}".
    Extract or simulate the item-wise billed amounts for the following BOQ items.
    
    BOQ Items:
    ${boqItems.map(b => `- ${b.id}: ${b.description} (Executed: ${b.executedQty} ${b.unit} @ ${b.rate})`).join('\n')}
    
    Determine how much of the executed value is being billed in this specific running bill document.
    Return a list of items where "amount" is the bill amount for that item.
    Only return items that are likely present in this bill.
    
    Return JSON array of objects with keys: boqId, amount.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              boqId: { type: Type.STRING },
              amount: { type: Type.NUMBER }
            },
            required: ["boqId", "amount"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Running Bill Detail extraction error:", error);
    return [];
  }
};

export const parseBOQDocument = async (docName: string): Promise<BOQItem[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    You are a Quantity Surveyor. Analyze the BOQ document named "${docName}".
    Extract or simulate plausible Bill of Quantities items that would be in this file.
    
    Return a list of 3-5 items with:
    - id (e.g., "ITEM-01")
    - description
    - unit (CUM, SQM, NOS, KG, RMT, CFT)
    - rate (selling rate)
    - qty (planned quantity)
    
    Return JSON array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              description: { type: Type.STRING },
              unit: { type: Type.STRING },
              rate: { type: Type.NUMBER },
              qty: { type: Type.NUMBER }
            },
            required: ["id", "description", "unit", "rate", "qty"]
          }
        }
      }
    });
    
    const items = JSON.parse(response.text || "[]");
    return items.map((i: any) => {
        const rate = Number(i.rate);
        const plannedCost = rate * 0.85; // Estimate internal cost
        return {
            id: i.id || `NEW-${Math.random().toString(36).substr(2,4)}`,
            description: i.description || "New Item",
            unit: i.unit || 'NOS',
            rate: rate,
            plannedQty: Number(i.qty),
            executedQty: 0,
            plannedUnitCost: plannedCost,
            plannedBreakdown: {
                material: plannedCost * 0.6,
                labor: plannedCost * 0.3,
                equipment: plannedCost * 0.05,
                overhead: plannedCost * 0.05
            },
            priority: 'MEDIUM',
        } as unknown as BOQItem;
    });
  } catch (error) {
    console.error("BOQ Parse error:", error);
    return [];
  }
};
