import { z } from "zod";

export function zodSchemaBodyValidation<Schema extends z.ZodObject<any, any>>(
  body: Buffer,
  schema: Schema
): z.infer<Schema> {
  const input = JSON.parse(body.toString("utf8"));
  const parsedBody = JSON.parse(input as string);
  const parsed = schema.safeParse(parsedBody);
  if (parsed.success) {
    return parsed.data as Required<z.infer<Schema>>;
  } else {
    throw new Error("Invalid request body");
  }
}
