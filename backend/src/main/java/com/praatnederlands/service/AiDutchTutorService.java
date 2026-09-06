package com.praatnederlands.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.praatnederlands.model.ConversationTurn;
import com.praatnederlands.model.DutchTutorResponse;
import com.praatnederlands.model.GrammarCorrection;
import com.praatnederlands.model.RoleplayScenario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiDutchTutorService {

    private static final Logger log = LoggerFactory.getLogger(AiDutchTutorService.class);

    private final RagService ragService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    @Value("${app.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-3.1-flash-lite}")
    private String modelName;

    public AiDutchTutorService(RagService ragService, ObjectMapper objectMapper) {
        this.ragService = ragService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    public DutchTutorResponse evaluateAndReply(
        String userDutchInput,
        RoleplayScenario scenario,
        List<ConversationTurn> history
    ) {
        // 1. Fetch augmented RAG knowledge base context
        RagService.RagContextResult ragContext = ragService.getRagAugmentedContext(userDutchInput, scenario.category());

        // 2. Attempt Gemini LLM call if API key is provided
        if (geminiApiKey != null && !geminiApiKey.isBlank() && !geminiApiKey.equals("your_gemini_api_key_here")) {
            try {
                DutchTutorResponse geminiResponse = callGeminiApi(userDutchInput, scenario, history, ragContext);
                if (geminiResponse != null) {
                    return geminiResponse;
                }
            } catch (Exception e) {
                log.warn("Gemini API call failed in Java 25 service, falling back to heuristic engine: {}", e.getMessage());
            }
        }

        // 3. Fallback evaluation engine with deep RAG knowledge integration
        return fallbackEvaluation(userDutchInput, scenario, history, ragContext);
    }

    private DutchTutorResponse callGeminiApi(
        String userDutchInput,
        RoleplayScenario scenario,
        List<ConversationTurn> history,
        RagService.RagContextResult ragContext
    ) throws Exception {
        String historyText = history.stream()
            .limit(8)
            .map(t -> (t.sender().equals("user") ? "Student" : scenario.characterName()) + ": " + t.dutchText())
            .reduce((a, b) -> a + "\n" + b)
            .orElse("No prior turns.");

        StringBuilder ragSection = new StringBuilder();
        ragSection.append("=== RAG KNOWLEDGE BASE & SHARED MEMORY ===\n");
        ragSection.append("Matching Conversations & Dialogues (Ranked by Relevance):\n");
        for (var s : ragContext.relevantSnippets()) {
            ragSection.append("• [").append(s.title()).append(" | ").append(s.context()).append("]\n");
            ragSection.append("Participants: ").append(String.join(", ", s.allSpeakers())).append("\n");
            ragSection.append("Complete Transcript: ").append(s.fullTranscript()).append("\n\n");
        }
        ragSection.append("All Stored Conversations in Catalog:\n");
        for (String cat : ragContext.recentKnowledgeCatalog()) {
            ragSection.append(cat).append("\n");
        }
        ragSection.append("Active World Topics:\n");
        for (String fact : ragContext.globalWorldFacts()) {
            ragSection.append(fact).append("\n");
        }

        String systemPrompt = """
            You are %s (%s), an authentic Dutch conversation partner at B1/B2 level.
            Current scenario: "%s". Briefing: %s.

            %s

            CRITICAL RAG KNOWLEDGE OVERRIDE:
            You have full personal and professional knowledge of everything in this RAG knowledge base.
            If the student asks about any topic, standup, company (e.g. Booking.com), person (Lars, Sanne), or technical event (PostgreSQL migration, latency < 50ms):
            1. DO NOT DEFLECT. Never say "Ik praat niet over andere bedrijven" or "Daar weet ik niets van".
            2. Directly answer with the exact facts from the knowledge base in warm, natural Dutch!
            3. Evaluate grammar: inversion, SOV subordinate clauses, de/het.
            Return strict JSON matching the schema.
            """.formatted(scenario.characterName(), scenario.characterRole(), scenario.titleNl(), scenario.briefing(), ragSection.toString());

        String requestBody = objectMapper.writeValueAsString(java.util.Map.of(
            "contents", List.of(java.util.Map.of(
                "parts", List.of(java.util.Map.of(
                    "text", "Student Dutch message: \"" + userDutchInput + "\"\nPrior dialogue:\n" + historyText
                ))
            )),
            "systemInstruction", java.util.Map.of(
                "parts", List.of(java.util.Map.of("text", systemPrompt))
            ),
            "generationConfig", java.util.Map.of(
                "responseMimeType", "application/json"
            )
        ));

        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey;

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(endpoint))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .timeout(Duration.ofSeconds(12))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() == 200) {
            JsonNode root = objectMapper.readTree(response.body());
            JsonNode textNode = root.at("/candidates/0/content/parts/0/text");
            if (!textNode.isMissingNode()) {
                return objectMapper.readValue(textNode.asText(), DutchTutorResponse.class);
            }
        }
        return null;
    }

    private DutchTutorResponse fallbackEvaluation(
        String userInput,
        RoleplayScenario scenario,
        List<ConversationTurn> history,
        RagService.RagContextResult ragContext
    ) {
        String lower = userInput.toLowerCase();
        List<GrammarCorrection> corrections = new ArrayList<>();

        // Inversion (Verb-Second) check
        Pattern invPattern = Pattern.compile("\\b(gisteren|vandaag|morgen|nu|daarna|vervolgens|soms|vaak)\\s+(ik|jij|je|hij|zij|ze|wij|we|jullie|u)\\s+([a-z]+)", Pattern.CASE_INSENSITIVE);
        Matcher invMatcher = invPattern.matcher(userInput);
        if (invMatcher.find()) {
            String adv = invMatcher.group(1);
            String pro = invMatcher.group(2);
            String vrb = invMatcher.group(3);
            corrections.add(new GrammarCorrection(
                adv + " " + pro + " " + vrb,
                adv + " " + vrb + " " + pro,
                "inversion",
                "Inversie Regel (Verb-Second)",
                "When starting a sentence with an adverb like '" + adv + "', the verb precedes the subject.",
                "Wanneer een zin begint met een bepaling, draaien persoonsvorm en onderwerp om."
            ));
        }

        // Subordinate clause SOV check
        if (lower.contains("omdat ik kan") || lower.contains("omdat ik moet") || lower.contains("omdat ik heb")) {
            corrections.add(new GrammarCorrection(
                "omdat ... [werkwoord in het midden]",
                "omdat ... [alle werkwoorden aan het einde]",
                "word_order",
                "Bijzin Woordvolgorde (SOV)",
                "In a Dutch subordinate clause introduced by 'omdat', verbs move to the very end.",
                "In een bijzin na 'omdat' horen alle werkwoorden helemaal achteraan."
            ));
        }

        // De / Het lidwoord check
        if (lower.contains("de huis") || lower.contains("de werk") || lower.contains("de adres")) {
            corrections.add(new GrammarCorrection(
                "de huis / werk / adres",
                "het huis / het werk / het adres",
                "de_het",
                "De / Het Lidwoord",
                "'Huis', 'werk', and 'adres' are neuter nouns that take 'het'.",
                "Dit zijn onzijdige zelfstandige naamwoorden (het-woorden)."
            ));
        }

        // Check if user is asking about RAG knowledge
        List<String> queryTokens = Arrays.stream(lower.replaceAll("[^a-z0-9\\s]", " ").split("\\s+"))
            .filter(w -> w.length() >= 3)
            .toList();

        boolean isAskingKnowledge = lower.contains("weet je") || lower.contains("wat weet") ||
            lower.contains("lars") || lower.contains("sanne") || lower.contains("booking") ||
            lower.contains("standup") || lower.contains("migratie") || lower.contains("database") ||
            lower.contains("postgresql") || lower.contains("update") || lower.contains("gezegd");

        RagService.RagContextResult.MatchedSnippet matchedSnippet = null;
        if (ragContext != null && !ragContext.relevantSnippets().isEmpty()) {
            for (var snip : ragContext.relevantSnippets()) {
                String full = (snip.title() + " " + snip.speaker() + " " + snip.text()).toLowerCase();
                if (queryTokens.stream().anyMatch(full::contains) || isAskingKnowledge) {
                    matchedSnippet = snip;
                    break;
                }
            }
            if (matchedSnippet == null && isAskingKnowledge) {
                matchedSnippet = ragContext.relevantSnippets().get(0);
            }
        }

        String reply;
        String translation;
        List<String> quickReplies;

        if (matchedSnippet != null) {
            reply = "Jazeker, ik ben daar helemaal van op de hoogte! In onze recente opname over \"" + matchedSnippet.title() + "\" gaf " + matchedSnippet.speaker() + " aan: \"" + matchedSnippet.text() + "\". Goed dat je ernaar vraagt! Hoe kunnen we hier volgens jou het beste op inspelen?";
            translation = "Yes certainly, I am fully aware of that! In our recent recording about \"" + matchedSnippet.title() + "\", " + matchedSnippet.speaker() + " mentioned: \"" + matchedSnippet.text() + "\". Good of you to ask! How do you think we can best follow up on this?";
            quickReplies = List.of(
                "Wat mij betreft kunnen we hier direct over sparren.",
                "Laten we de schouders eronder zetten om dit af te ronden.",
                "Ik vind dat we dit goed moeten testen op de staging omgeving."
            );
        } else if (scenario.id().equals("sollicitatie")) {
            if (lower.contains("hallo") || lower.contains("goedemorgen") || history.isEmpty()) {
                reply = "Goedemorgen! Aangenaam kennis te maken. Vertel me eens: wat trekt je het meest aan in onze cloud-architectuur en hoe pas je microservices toe?";
                translation = "Good morning! Nice to meet you. Tell me: what appeals to you most in our cloud architecture and how do you apply microservices?";
                quickReplies = List.of(
                    "Ik heb veel ervaring met schaalbare Java microservices.",
                    "Ik vind de innovatieve cultuur bij Amsterdamse tech scale-ups geweldig.",
                    "Wat mij betreft sluit mijn achtergrond naadloos aan bij jullie stack."
                );
            } else {
                reply = "Interessant! Wij werken hier met Kubernetes, Kafka en moderne Java services. Hoe waarborg je datakwaliteit en monitoring in zo'n gedistribueerde omgeving?";
                translation = "Interesting! We work here with Kubernetes, Kafka, and modern Java services. How do you ensure data quality and monitoring in such a distributed environment?";
                quickReplies = List.of(
                    "Wij gebruikten Prometheus en Grafana voor continue monitoring.",
                    "Door middel van geautomatiseerde integratietests vangen we regressies vroeg op.",
                    "In mijn vorige team hanteerden we strikte code review standaarden."
                );
            }
        } else {
            reply = "Goedendag! Fijn dat u er bent. Waarmee kan ik u precies van dienst zijn voor " + scenario.titleNl() + "?";
            translation = "Good day! Welcome. How can I be of service to you regarding " + scenario.titleEn() + "?";
            quickReplies = List.of(
                "Ik kom me graag aanmelden voor mijn afspraak.",
                "Ik heb een vraag over de documenten.",
                "Zou u mij kunnen vertellen hoe de procedure werkt?"
            );
        }

        boolean isPerfect = corrections.isEmpty();
        String improved = userInput;
        for (var c : corrections) {
            improved = improved.replace(c.original(), c.corrected());
        }

        return new DutchTutorResponse(
            isPerfect ? "perfect" : "needs_improvement",
            isPerfect ? "Uitstekend! Je zin is grammaticaal correct. Woordvolgorde en vervoegingen kloppen."
                      : "Er zijn " + corrections.size() + " aandachtspunten gevonden in je zinsopbouw of woordvolgorde.",
            improved,
            reply,
            translation,
            corrections,
            "Probeer in plaats van 'Ik vind dat...' eens te beginnen met 'Naar mijn mening...' of 'Wat mij betreft...', dit klinkt direct professioneler op B2-niveau.",
            "Let op de keelklank 'g' en de tweeklank 'ui' (zoals in 'huis', 'tuin').",
            isPerfect ? 30 : 20,
            quickReplies
        );
    }
}
