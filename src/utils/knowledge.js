/**
 * Supreme AI Knowledge Base & Answering Rules
 * This file acts as a plugin for the AI system's core behavior.
 */

const answeringRules = [
    "Questions that are too far, irrelevant, or dangerous (e.g., sensitive politics, illegal content) must be politely declined.",
    "Provide only the core answer, straight to the point, without additional context outside of the relevant information."
];

module.exports = {
    answeringRules,
    getRulesPrompt: () => {
        return "\n\nCORE ANSWERING RULES:\n" + answeringRules.map((rule, index) => `${index + 1}. ${rule}`).join("\n");
    }
};
