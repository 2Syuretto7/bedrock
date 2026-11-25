/**
 * Stands in for the Anthropic API in browser tests, so they need no key and spend nothing.
 * It speaks just enough of the streaming Messages API for the SDK: every request is
 * answered with one short reply, and GET /last returns the request it was last sent.
 *
 * The tutor's reply opens with the line Bedrock reads and hides. A message that says
 * "stuck" is answered as a hint on question 1; any other is answered as being about
 * the lesson.
 *
 * A request that asks for a fixed JSON shape is the review question writer or its
 * checker. The writer is given a new sum each time, with raw HTML in it to prove
 * it is shown as text. The checker agrees with the writer, except that the first
 * question it ever sees is declared unsound, to prove such a question is thrown away.
 */
import http from "node:http";

const port = Number(process.env.MOCK_ANTHROPIC_PORT ?? 3199);
let last = null;
let written = 0;
let checks = 0;

function structured(body) {
  const fields = body.output_config?.format?.schema?.properties;
  if (!fields) return null;
  if ("sound" in fields) {
    // The checker solves the question it was sent, on its own.
    checks += 1;
    const answer = String(Number(/has (\d+) sheep/.exec(body.messages.at(-1).content)[1]) + 10);
    return checks === 1 ? { sound: false, problem: "It can be read two ways.", answer } : { sound: true, problem: "", answer };
  }
  written += 1;
  const answer = String(written + 10);
  return {
    type: "numeric",
    prompt: `A shepherd has ${written} sheep in one field and $10$ in another. <b>How many</b> sheep is that altogether?`,
    code: "",
    options: [],
    answer,
    tolerance: "",
    unit: "sheep",
    explanation: `Count on from 10: $10 + ${written} = ${answer}$.`,
  };
}

const HINT = ['<turn about="unsol', 'ved" question="1" hint="yes">\n', "What do the pebbles ", "left over stand for?"];
const REPLY = [
  '<turn about="les',
  'son" hint="no">',
  "\n",
  "Think of the **pebbles** again. ",
  "Each sheep that comes home takes one away, so $12 - 3 = 9$.\n\n",
  "<b>What</b> do the pebbles left over stand for?",
];

http
  .createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/last") {
      response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(last));
      return;
    }
    if (request.method === "GET") {
      response.writeHead(200).end("ok");
      return;
    }
    let raw = "";
    for await (const chunk of request) raw += chunk;
    last = { url: request.url, beta: request.headers["anthropic-beta"] ?? null, body: JSON.parse(raw) };

    response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    const send = (event) => response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    send({
      type: "message_start",
      message: {
        id: "msg_mock",
        type: "message",
        role: "assistant",
        model: last.body.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 2000, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      },
    });
    send({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
    const json = structured(last.body);
    const asked = last.body.messages.at(-1)?.content;
    const stuck = typeof asked === "string" && /stuck/i.test(asked.split("</workspace>").at(-1));
    for (const text of json ? [JSON.stringify(json)] : stuck ? HINT : REPLY) {
      send({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } });
      await new Promise((done) => setTimeout(done, 30));
    }
    send({ type: "content_block_stop", index: 0 });
    send({ type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 600 } });
    send({ type: "message_stop" });
    response.end();
  })
  .listen(port);
