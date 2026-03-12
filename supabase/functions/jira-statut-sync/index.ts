// supabase/functions/jira-status-sync/index.ts
//
// SETUP :
// 1. Déployer : supabase functions deploy jira-status-sync --no-verify-jwt
//
// 2. Dans Jira → Project Settings → Automation (ou Settings → System → Webhooks) :
//    - URL : https://mgsnbhqndqnmvzgigoik.supabase.co/functions/v1/jira-status-sync
//    - Events : Issue updated (transition de statut)
//
// 3. Optionnel : ajouter un secret JIRA_WEBHOOK_SECRET dans Supabase pour sécuriser

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Mapping statut Jira → statut Shrimply
const JIRA_STATUS_MAP: Record<string, string> = {
  // Anglais (Jira par défaut)
  "to do": "open",
  "in progress": "in_progress",
  "done": "done",
  "rejected": "rejected",
  "closed": "done",
  "resolved": "done",
  "won't do": "rejected",
  "wont do": "rejected",
  // Français
  "à faire": "open",
  "en cours": "in_progress",
  "terminé": "done",
  "terminée": "done",
  "refusé": "rejected",
  "annulé": "rejected",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const payload = await req.json()
    console.log("Payload Jira reçu:", JSON.stringify(payload, null, 2))

    // Jira envoie l'événement dans payload.webhookEvent
    const event = payload.webhookEvent
    if (event !== "jira:issue_updated") {
      return new Response(
        JSON.stringify({ skipped: true, reason: `Event ignoré: ${event}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const issue = payload.issue
    if (!issue) throw new Error("Aucune issue dans le payload Jira.")

    const jiraKey = issue.key // ex: SHRIM-1
    const jiraStatus = issue.fields?.status?.name?.toLowerCase().trim()

    if (!jiraKey || !jiraStatus) {
      throw new Error("Clé Jira ou statut manquant dans le payload.")
    }

    console.log(`Issue ${jiraKey} → statut Jira: "${jiraStatus}"`)

    // Trouver le statut Shrimply correspondant
    const shrimplyStatus = JIRA_STATUS_MAP[jiraStatus]
    if (!shrimplyStatus) {
      console.log(`Statut Jira "${jiraStatus}" non mappé — ignoré.`)
      return new Response(
        JSON.stringify({ skipped: true, reason: `Statut "${jiraStatus}" non mappé` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Trouver le ticket Supabase via jira_issue_id
    const { data: ticket, error: findError } = await supabase
      .from("tickets")
      .select("id, status")
      .eq("jira_issue_id", jiraKey)
      .single()

    if (findError || !ticket) {
      console.log(`Ticket avec jira_issue_id="${jiraKey}" introuvable dans Supabase.`)
      return new Response(
        JSON.stringify({ skipped: true, reason: `Ticket ${jiraKey} introuvable` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Pas de mise à jour si le statut est déjà le même
    if (ticket.status === shrimplyStatus) {
      console.log(`Statut déjà à jour : ${shrimplyStatus}`)
      return new Response(
        JSON.stringify({ skipped: true, reason: "Statut déjà à jour" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Mettre à jour le statut dans Supabase
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ status: shrimplyStatus })
      .eq("id", ticket.id)

    if (updateError) throw new Error(`Erreur update Supabase: ${updateError.message}`)

    console.log(`✅ Ticket ${jiraKey} mis à jour : ${ticket.status} → ${shrimplyStatus}`)

    return new Response(
      JSON.stringify({ success: true, jira_key: jiraKey, old_status: ticket.status, new_status: shrimplyStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Erreur jira-status-sync:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})