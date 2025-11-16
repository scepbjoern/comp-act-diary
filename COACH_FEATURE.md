# Coach Feature Documentation

## Overview

The **Coach** (ACT Coach) is a chat interface powered by AI that provides coaching based on Acceptance and Commitment Therapy (ACT) principles. This first prototype implements a multi-mode chat system where each mode has a different system prompt for specialized coaching.

## Architecture

### Technology Stack

- **Frontend**: Next.js (React) with TypeScript
- **AI SDK**: Vercel AI SDK (`ai` package)
- **LLM Provider**: Together AI (via `@ai-sdk/togetherai`)
- **Agent Framework**: Mastra (`mastra` package) - placeholder for future features
- **Database**: PostgreSQL via Prisma ORM
- **Streaming**: Server-Sent Events (SSE) via AI SDK

### Key Components

1. **UI**: `app/coach/page.tsx`
   - Dropdown to select chat methods/modes
   - Settings modal to manage chat methods
   - Chat interface with streaming responses
   - Reset chat button

2. **API Routes**:
   - `app/api/coach/methods/route.ts` - List and create chat methods
   - `app/api/coach/methods/[id]/route.ts` - Update and delete chat methods
   - `app/api/coach/chat/route.ts` - Handle chat interactions with streaming

3. **Data Layer**: `lib/chatMethod.ts`
   - CRUD operations for ChatMethod model
   - Type-safe database access

4. **Mastra Integration**: `lib/mastra-agent.ts`
   - Placeholder for future Mastra agent configuration
   - Currently using AI SDK directly for simplicity

### Database Schema

```prisma
model ChatMethod {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name         String
  systemPrompt String   @db.Text
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId])
}
```

## Current Implementation

### What Works

✅ **Chat Methods Management**
- Create new chat methods with custom system prompts
- Edit existing chat methods
- Delete chat methods
- List all methods for current user

✅ **Chat Interface**
- Select active chat method from dropdown
- Send messages and receive streaming responses
- Reset conversation
- Visual distinction between user and assistant messages

✅ **AI Integration**
- Together AI as LLM provider
- Llama 3.1 70B Instruct Turbo model
- System prompts from selected chat method
- Streaming responses for real-time UX

### What's NOT Implemented (Yet)

❌ **Message Persistence**
- Chat messages are session-based only
- No conversation history in database
- Fresh start on page reload

❌ **RAG (Retrieval Augmented Generation)**
- No context from ACT book
- No context from user's journal entries
- No context from user's reflections

❌ **Long-term Memory**
- No conversation memory across sessions
- No user profile/preferences in prompts

❌ **Tool Calling**
- No integration with app features
- Can't create reflections, log moods, etc. from chat

❌ **Mastra Features**
- Not using Mastra workflows yet
- No multi-agent systems
- No evaluation/testing framework

## Environment Variables

Required environment variable:

```bash
# Together AI API Key (already exists in .env)
TOGETHERAI_API_KEY=your_api_key_here
```

The system will also fall back to `TOGETHER_API_KEY` if needed.

## Usage

### As a User

1. Navigate to `/coach` page
2. Click the settings icon to create your first chat method
3. Enter a name (e.g., "Values Clarification") and system prompt
4. Select the method from dropdown
5. Start chatting!

### Example Chat Methods

**1. ACT Basics**
```
You are an ACT (Acceptance and Commitment Therapy) coach helping users understand core ACT principles. Explain concepts clearly, use metaphors, and relate teachings to the user's daily life.
```

**2. Values Exploration**
```
You are an ACT coach specialized in helping users clarify and connect with their core values. Ask thoughtful questions to help users identify what truly matters to them and how to live more aligned with those values.
```

**3. Defusion Practice**
```
You are an ACT coach focused on cognitive defusion. Help users notice and step back from unhelpful thoughts. Teach defusion techniques and guide users in practicing them with specific thoughts they're struggling with.
```

## Future Roadmap

### Phase 2: Message Persistence
- Store conversations in database
- Conversation history UI
- Resume previous conversations

### Phase 3: RAG Integration
- Load ACT book content into vector database
- Embed user's journal entries
- Provide relevant context in responses

### Phase 4: Long-term Memory
- Remember user preferences
- Track progress over time
- Personalize coaching approach

### Phase 5: Tool Calling
- Create reflections from chat
- Log mood/symptoms
- Set reminders
- Suggest exercises

### Phase 6: Advanced Mastra Features
- Multi-agent workflows
- Evaluation and testing
- A/B testing different prompts
- Analytics and insights

## API Reference

### GET /api/coach/methods
Returns all chat methods for the current user.

**Response:**
```json
{
  "methods": [
    {
      "id": "uuid",
      "name": "ACT Basics",
      "systemPrompt": "You are...",
      "createdAt": "2025-11-16T...",
      "updatedAt": "2025-11-16T..."
    }
  ]
}
```

### POST /api/coach/methods
Creates a new chat method.

**Request:**
```json
{
  "name": "Values Clarification",
  "systemPrompt": "You are an ACT coach..."
}
```

### PATCH /api/coach/methods/:id
Updates an existing chat method.

### DELETE /api/coach/methods/:id
Deletes a chat method.

### POST /api/coach/chat
Streams chat responses using Server-Sent Events.

**Request:**
```json
{
  "chatMethodId": "uuid",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}
```

**Response:** Text stream (SSE)

## Development Notes

### TypeScript Errors
If you see TypeScript errors about `ai/react` module not found, restart the dev server:
```bash
npm run dev
```

The `ai` package exports are loaded dynamically.

### Database Migrations
After pulling schema changes:
```bash
npx prisma migrate dev
npx prisma generate
```

### Testing
Currently no automated tests. Manual testing workflow:
1. Create a chat method
2. Select it and send a message
3. Verify streaming response works
4. Edit the method and verify changes apply
5. Delete the method

## Troubleshooting

**Problem**: "Chat method not found"
- Ensure you've created at least one chat method
- Check browser console for API errors

**Problem**: "Internal server error" in chat
- Check TOGETHERAI_API_KEY is set
- Verify Together AI API is accessible
- Check server logs for details

**Problem**: Messages not streaming
- Clear browser cache
- Check network tab for SSE connection
- Verify API route is responding

## License & Attribution

This feature uses:
- [Vercel AI SDK](https://sdk.vercel.ai/) - MIT License
- [Together AI](https://www.together.ai/) - Commercial API
- [Mastra](https://mastra.ai/) - Open source agent framework
