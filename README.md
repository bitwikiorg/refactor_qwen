# COREAI Research System

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/coreai.git
   cd coreai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` and fill in the required values.

4. Start the application:
   ```bash
   npm start
   ```

## File Structure
```
app/
  features/
    self/
      self_page.js
      self_page.py
    token_classifier/
      token_classifier.js
      token_classifier.py
    chat/
      chat_prompt.mjs
  infrastructure/
    error-handler.mjs
index.js
tests/
  unit/
    self.spec.js
    token_classifier.spec.js
```

## API Reference
### `/api/token/classify`
- **Method**: POST
- **Description**: Classifies a token based on input data.
- **Request Body**:
  ```json
  {
      "token": "example"
  }
  ```
- **Response**:
  ```json
  {
      "classification": "valid"
  }
  ```

## Troubleshooting
- Ensure all environment variables are set correctly.
- Check logs for detailed error messages.
