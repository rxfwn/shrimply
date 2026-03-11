import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-jira-url, x-jira-email, x-jira-token, x-jira-project",
}

const TYPE_TO_JIRA = {
  bug: "Tâche",
  feature: "Tâche",
  idea: "Tâche",
}

const TYPE_TO_PRIORITY = {
  bug: "High",
  feature: "Medium",
  idea: "Low",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    // Lire depuis les headers du webhook EN PRIORITÉ, sinon fallback sur les secrets
    const JIRA_BASE_URL = req.headers.get("x-jira-url") || Deno.env.get("JIRA_BASE_URL")
    const JIRA_EMAIL = req.headers.get("x-jira-email") || Deno.env.get("JIRA_EMAIL")
    const JIRA_API_TOKEN = req.headers.get("x-jira-token") || Deno.env.get("JIRA_API_TOKEN")
    const JIRA_PROJECT_KEY = req.headers.get("x-jira-project") || Deno.env.get("JIRA_PROJECT_KEY")

    console.log("Config Jira:", {
      url: JIRA_BASE_URL ? "✅" : "❌ manquant",
      email: JIRA_EMAIL ? "✅" : "❌ manquant",
      token: JIRA_API_TOKEN ? "✅" : "❌ manquant",
      project: JIRA_PROJECT_KEY ? "✅" : "❌ manquant",
    })

    if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
      throw new Error("Variables Jira manquantes — vérifie les headers du webhook ou les secrets.")
    }

    const payload = await req.json()
    const ticket = payload.record
    if (!ticket) throw new Error("Aucun ticket dans le payload.")

    const issueType = TYPE_TO_JIRA[ticket.type] || "Task"
    const priority = TYPE_TO_PRIORITY[ticket.type] || "Medium"
    const typeEmoji = ticket.type === "bug" ? "🐛" : ticket.type === "feature" ? "✨" : "💡"

    const jiraPayload = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        summary: `${typeEmoji} ${ticket.title}`,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: ticket.description || "" }]
            },
            {
              type: "paragraph",
              content: [{
                type: "text",
                text: `— Shrimply | Type: ${ticket.type} | ID: ${ticket.id}`,
                marks: [{ type: "em" }]
              }]
            }
          ]
        },
        issuetype: { name: issueType },
        priority: { name: priority },
        labels: ["shrimply", ticket.type],
      }
    }

    const credentials = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`)

    const response = await fetch(`${JIRA_BASE_URL}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jiraPayload),
    })

    const responseText = await response.text()
    console.log(`Jira response ${response.status}:`, responseText)

    if (!response.ok) {
      throw new Error(`Jira API error ${response.status}: ${responseText}`)
    }

    const jiraIssue = JSON.parse(responseText)
    console.log(`✅ Ticket Jira créé : ${jiraIssue.key}`)

    // Sauvegarder l'ID Jira dans Supabase
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2")
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    )
    await supabase.from("tickets").update({ jira_issue_id: jiraIssue.key }).eq("id", ticket.id)

    return new Response(
      JSON.stringify({ success: true, jira_key: jiraIssue.key }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Erreur sync Jira:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})