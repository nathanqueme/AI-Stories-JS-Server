
export * as configs from './configs'
export { default as aws } from './aws'
export * from './firebase'
export * as openAI from './openai'
// (DEPRECATED) export * as storage from './storage'

// OTHER WAY TO EXPORT MANY FUNCTIONS VIA AN OBJECT
/**
 export const function2 = () => {
  // function logic
};

export const function3 = () => {
  // function logic
};

// Define the database object using the spread operator
export const database = { ...exports }; 
*/