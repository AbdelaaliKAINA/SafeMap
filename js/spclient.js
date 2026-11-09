/* 
Ce fichier est le seul endroit qui connaît l'adresse du projet Supabase.
Si on change de projet, c'est le seul fichier à modifier.

La clé "publishable" (anciennement "anon") est faite pour être visible dans le code du navigateur : elle ne donne aucun pouvoir à elle seule. 
C'est la sécurité au niveau des lignes (RLS, voir schema.sql) qui protège les données.

*/

const SUPABASE_URL = "https://eknvswnbraaxwzyedsnh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qeFlM57yOnCb4mZ7NJs3Fw_Ajc291kZx";

// `supabase` est une variable globale fournie par la bibliothèque (chargée via le CDN, voir les balises <script> des pages HTML). 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);