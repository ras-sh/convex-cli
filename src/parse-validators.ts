import type {
  GenericValidator,
  VArray,
  VBoolean,
  VBytes,
  VFloat64,
  VId,
  VInt64,
  VLiteral,
  VNull,
  VObject,
  VString,
  VUnion,
} from "convex/values";
import type { JsonSchema } from "./types";

// Type guards for validator kinds
function isStringValidator(validator: GenericValidator): validator is VString {
  return validator.kind === "string";
}

function isFloat64Validator(
  validator: GenericValidator
): validator is VFloat64 {
  return validator.kind === "float64";
}

function isInt64Validator(validator: GenericValidator): validator is VInt64 {
  return validator.kind === "int64";
}

function isBooleanValidator(
  validator: GenericValidator
): validator is VBoolean {
  return validator.kind === "boolean";
}

function isNullValidator(validator: GenericValidator): validator is VNull {
  return validator.kind === "null";
}

function isBytesValidator(validator: GenericValidator): validator is VBytes {
  return validator.kind === "bytes";
}

function isLiteralValidator(
  validator: GenericValidator
): validator is VLiteral<unknown> {
  return validator.kind === "literal";
}

function isIdValidator(validator: GenericValidator): validator is VId<unknown> {
  return validator.kind === "id";
}

function isArrayValidator(
  validator: GenericValidator
): validator is VArray<unknown, GenericValidator> {
  return validator.kind === "array";
}

function isObjectValidator(
  validator: GenericValidator
): validator is VObject<unknown, Record<string, GenericValidator>> {
  return validator.kind === "object";
}

function isUnionValidator(
  validator: GenericValidator
): validator is VUnion<unknown, GenericValidator[]> {
  return validator.kind === "union";
}

export function parseConvexValidator(
  validator: GenericValidator | undefined
): JsonSchema {
  if (!validator) {
    return { type: "object", properties: {} };
  }

  const baseSchema = parseValidatorType(validator);

  // Handle optional fields
  if (validator.isOptional === "optional") {
    return {
      type: "object",
      anyOf: [baseSchema, { type: "null" }],
    };
  }

  return baseSchema;
}

function parseValidatorType(validator: GenericValidator): JsonSchema {
  if (isNullValidator(validator)) {
    return { type: "null" };
  }

  if (isFloat64Validator(validator)) {
    return { type: "number" };
  }

  if (isInt64Validator(validator)) {
    return { type: "integer" };
  }

  if (isBooleanValidator(validator)) {
    return { type: "boolean" };
  }

  if (isStringValidator(validator)) {
    return { type: "string" };
  }

  if (isBytesValidator(validator)) {
    return {
      type: "string",
      description: "Base64 encoded bytes",
    };
  }

  if (isLiteralValidator(validator)) {
    const valueType = typeof validator.value;
    const schemaType =
      valueType === "string" ||
      valueType === "number" ||
      valueType === "boolean"
        ? valueType
        : "string";
    return {
      type: schemaType,
      enum: [validator.value as string | number | boolean],
    };
  }

  if (isIdValidator(validator)) {
    return {
      type: "string",
      description: `ID for table: ${validator.tableName}`,
    };
  }

  if (isArrayValidator(validator)) {
    return {
      type: "array",
      items: parseValidatorType(validator.element),
    };
  }

  if (isObjectValidator(validator)) {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const [fieldName, fieldValidator] of Object.entries(
      validator.fields
    )) {
      const fieldVal = fieldValidator as GenericValidator;
      properties[fieldName] = parseConvexValidator(fieldVal);
      if (fieldVal.isOptional === "required") {
        required.push(fieldName);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (isUnionValidator(validator)) {
    // For CLI purposes, treat unions as accepting any object
    // In a more sophisticated implementation, we could try to merge schemas
    return {
      type: "object",
      description: `Union of ${validator.members.length} types - provide as JSON`,
      additionalProperties: true,
    };
  }

  // Handle record and any types
  if (validator.kind === "record") {
    // For CLI purposes, treat records as objects with additional properties
    return {
      type: "object",
      description: "Record type - provide as JSON object",
      additionalProperties: true,
    };
  }

  if (validator.kind === "any") {
    return {
      type: "object",
      description: "Any type - provide as JSON",
      additionalProperties: true,
    };
  }

  // Fallback for unknown validator kinds
  return {
    type: "object",
    description: `Unknown validator kind: ${validator.kind}`,
    additionalProperties: true,
  };
}

// Helper to extract positional arguments from JSON schema
export function extractPositionalArgs(schema: JsonSchema): Array<{
  name: string;
  type: string;
  required: boolean;
  description?: string;
}> {
  const positional: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }> = [];

  if (schema.type === "object" && schema.properties) {
    for (const [name, prop] of Object.entries(schema.properties)) {
      // Only simple types can be positional
      if (
        prop.type === "string" ||
        prop.type === "number" ||
        prop.type === "boolean"
      ) {
        const required = schema.required?.includes(name) ?? false;
        positional.push({
          name,
          type: prop.type,
          required,
          description: prop.description,
        });
      }
    }
  }

  return positional;
}
