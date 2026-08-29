# Demo-agent setup

1. Run `npm run build` in `mcp-interceptor`.
2. Copy `mcp.json.example` into the MCP configuration location required by the
   chosen MCP client, replacing `<ABSOLUTE_PATH_TO_REPO>` with the local path.
3. Add the contents of `SYSTEM_PROMPT.md` to the demo agent's system
   instruction.
4. Disable every raw side-effecting tool in that agent profile: shell, file
   write/delete, SQL, Git write, network mutation, deploy, and terminal tools.
5. Verify that the agent lists only `propose_action` and
   `check_action_status` for protected operations, then submit a harmless test
   proposal and confirm the returned state is `PENDING`.

The MCP configuration registers AgentGate but cannot remove tools supplied by a
host client. Step 4 is mandatory: a client that retains a raw execution tool is
outside the AgentGate security model.
