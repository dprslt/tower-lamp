module.exports = {
    parser: "@typescript-eslint/parser", // Specifies the ESLint parser
    extends: [

        "eslint:recommended",
        "plugin:@typescript-eslint/recommended" // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    ],
    parserOptions: {
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: "module" // Allows for the use of imports
    },
    "env": {
        "node": true,
        "es6": true
    },
    rules: {
        // Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
        // e.g. "@typescript-eslint/explicit-function-return-type": "off",
    },
    "semi": [
        "error",
        "never"
    ],
    "no-useless-escape": "off",
    "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
            "allowExpressions": true
        }
    ],
    "complexity": ["error"],
    "max-len": ["error", 120],
    "max-lines": ["error"],
    "max-depth": ["error"],
    "max-nested-callbacks": ["error", 3],
    "no-underscore-dangle": "off",
    "no-await-in-loop": ["off"],
};
