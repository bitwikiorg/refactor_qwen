const { classifyTokens } = require('./token_classifier');

function processInput(userInput) {
  // Step 1: Classify tokens using token classifier
  const tokenClassifications = classifyTokens(userInput);
  console.log("Token Classifications:", tokenClassifications);
  
  // Step 2: Pass the input to the main AI (assuming main_ai is defined/imported)
  const response = main_ai(userInput); // main_ai should be defined elsewhere
  return response;
}

module.exports = { processInput };