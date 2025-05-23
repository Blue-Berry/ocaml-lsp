import outdent from "outdent";
import * as Protocol from "vscode-languageserver-protocol";
import * as Types from "vscode-languageserver-types";
import { Position } from "vscode-languageserver-types";
import * as LanguageServer from "../src/LanguageServer";

describe("ocamllsp/wrappingAstNode", () => {
  let languageServer: LanguageServer.LanguageServer;

  function openDocument(source: string) {
    languageServer.sendNotification(
      Protocol.DidOpenTextDocumentNotification.type,
      {
        textDocument: Types.TextDocumentItem.create(
          "file:///test.ml",
          "ocaml",
          0,
          source,
        ),
      },
    );
  }

  async function sendWrappingAstNodeRequest({
    line,
    character,
  }: {
    line: number;
    character: number;
  }) {
    return languageServer.sendRequest("ocamllsp/wrappingAstNode", {
      uri: "file:///test.ml",
      position: Position.create(line, character),
    });
  }

  beforeEach(async () => {
    languageServer = await LanguageServer.startAndInitialize();
  });

  afterEach(async () => {
    await LanguageServer.exit(languageServer);
  });

  it("empty document", async () => {
    openDocument(
      outdent`
`,
    );

    const r = await sendWrappingAstNodeRequest({ line: 0, character: 0 });
    expect(r).toMatchInlineSnapshot("null");
  });

  const code_snippet_0 = outdent`
let k = 1

module M = struct
  let a =
    let b = 1 in
    b + 1

  let c = 2
end
  `;

  it("when on a toplevel let binding", async () => {
    openDocument(code_snippet_0);

    const r = await sendWrappingAstNodeRequest({ line: 0, character: 5 });

    /* given range corresponds to:
        let k = 1
    */
    expect(r).toMatchInlineSnapshot(`
{
  "end": {
    "character": 9,
    "line": 0,
  },
  "start": {
    "character": 0,
    "line": 0,
  },
}
`);
  });

  it("in between toplevel bindings (let and module def)", async () => {
    openDocument(code_snippet_0);

    const r = await sendWrappingAstNodeRequest({ line: 1, character: 0 });

    /* given range corresponds to:
        whole `code_snippet_0`
    */
    expect(r).toMatchInlineSnapshot(`
{
  "end": {
    "character": 3,
    "line": 8,
  },
  "start": {
    "character": 0,
    "line": 0,
  },
}
`);
  });

  it("on keyword struct", async () => {
    openDocument(code_snippet_0);

    const r = await sendWrappingAstNodeRequest({ line: 2, character: 14 });

    /* given range corresponds to: the whole module definition M
        module M = struct
          let a =
            let b = 1 in
            b + 1

          let c = 2
        end
    */
    expect(r).toMatchInlineSnapshot(`
{
  "end": {
    "character": 3,
    "line": 8,
  },
  "start": {
    "character": 0,
    "line": 2,
  },
}
`);
  });

  it("on `b`'s let-binding (nested let-binding in a module def)", async () => {
    openDocument(code_snippet_0);
    const r = await sendWrappingAstNodeRequest({ line: 4, character: 10 });

    /* given range corresponds to:
        let a =
          let b = 1 in
          b + 1
    */
    expect(r).toMatchInlineSnapshot(`
{
  "end": {
    "character": 9,
    "line": 5,
  },
  "start": {
    "character": 2,
    "line": 3,
  },
}
`);
  });

  it("between `a`'s and `c`'s let-bindings in a module def", async () => {
    openDocument(code_snippet_0);

    const r = await sendWrappingAstNodeRequest({ line: 6, character: 0 });

    /* given range corresponds to: values in M, but not module binding itself
        let a =
          let b = 1 in
          b + 1

        let c = 2
    */
    expect(r).toMatchInlineSnapshot(`
{
  "end": {
    "character": 11,
    "line": 7,
  },
  "start": {
    "character": 2,
    "line": 3,
  },
}
`);
  });
});
