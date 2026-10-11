from dotenv import load_dotenv
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

load_dotenv(override=True)

prompt = """Make a vanilla html + JS + CSS website for a game of space invaders. Write the code to files in the current directory, including index.html."""

TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "AskUserQuestion"]
async def main():
    options = ClaudeAgentOptions(
        allowed_tools=TOOLS, model="claude-opus-5-5")
    async for message in query(prompt=prompt, options=options):
        print(message)


asyncio.run(main())
