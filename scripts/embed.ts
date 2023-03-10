import { MBBook, MBSection } from "@/types";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { Configuration, OpenAIApi } from "openai";

loadEnvConfig("");

const generateEmbeddings = async (sections: MBSection[]) => {
  const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
  const openai = new OpenAIApi(configuration);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  let sectionNum = 1;
  let chunkNum = 1;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    for (let j = 0; j < section.chunks.length; j++) {
      const chunk = section.chunks[j];

      const { chapter_num, chapter_title, content, content_length, content_tokens } = chunk;

      const embeddingResponse = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: content
      });

      const [{ embedding }] = embeddingResponse.data.data;

      const { data, error } = await supabase
        .from("mb")
        .insert({
          chapter_num,
          chapter_title,
          chunk_num: chunkNum,
          content,
          content_length,
          content_tokens,
          embedding
        })
        .select("*");

      if (error) {
        console.log("error", error);
      } else {
        console.log("saved", i, j);
      }

      chunkNum++;
    }

    sectionNum++;
  }
};

(async () => {
  const book: MBBook = JSON.parse(fs.readFileSync("scripts/mahabharata.json", "utf8"));

  await generateEmbeddings(book.sections);
})();
