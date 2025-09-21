import * as fs from "node:fs";
import * as path from "node:path";
import {
  type CallExpression,
  type ObjectLiteralExpression,
  Project,
  type PropertyAssignment,
  SyntaxKind,
  type VariableDeclaration,
} from "ts-morph";
import type { ArgDefinition, FunctionDefinition, FunctionType } from "../types";

// Regex patterns defined at top level for performance
const MODULE_IMPORT_REGEX = /import type \* as (\w+) from "\.\.\/(.+?)\.js";/g;
const OPTIONAL_VALIDATOR_REGEX = /v\.optional\((.+)\)/;

/**
 * TypeScript AST-based parser for Convex functions using ts-morph
 * Provides accurate and robust function discovery through static analysis
 */
export class ConvexAstParser {
  private readonly project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 1, // ES5
        module: 1, // CommonJS
        allowJs: true,
        checkJs: false,
        noEmit: true,
      },
    });
  }

  /**
   * Discover Convex functions by parsing TypeScript source files
   */
  discoverConvexFunctions(convexDir = "./convex"): FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];

    try {
      // Read the generated API file to get module imports
      const apiPath = path.join(convexDir, "_generated", "api.d.ts");

      if (!fs.existsSync(apiPath)) {
        return [];
      }

      const apiContent = fs.readFileSync(apiPath, "utf-8");
      const modules = this.extractModulesFromApi(apiContent);

      // Process each module file using AST parsing
      for (const module of modules) {
        const modulePath = path.join(convexDir, `${module.file}.ts`);

        if (!fs.existsSync(modulePath)) {
          continue;
        }

        const moduleContent = fs.readFileSync(modulePath, "utf-8");
        const moduleFunctions = this.extractFunctionsFromModule(
          moduleContent,
          module.name,
          modulePath
        );
        functions.push(...moduleFunctions);
      }

      return functions;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Extract module information from generated API file
   * Uses regex for reliable parsing of predictable generated code structure
   */
  private extractModulesFromApi(
    apiContent: string
  ): Array<{ name: string; file: string }> {
    const modules: Array<{ name: string; file: string }> = [];

    // Reset regex state for clean matching across multiple calls
    MODULE_IMPORT_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null = MODULE_IMPORT_REGEX.exec(apiContent);
    while (match !== null) {
      modules.push({
        name: match[1],
        file: match[2],
      });
      match = MODULE_IMPORT_REGEX.exec(apiContent);
    }

    return modules;
  }

  /**
   * Extract functions from a TypeScript module using AST analysis
   */
  private extractFunctionsFromModule(
    content: string,
    moduleName: string,
    filePath: string
  ): FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];

    try {
      // Add the source file to the project
      const sourceFile = this.project.createSourceFile(filePath, content, {
        overwrite: true,
      });

      // Find all variable declarations with export modifier
      const exportedVariables = sourceFile
        .getVariableDeclarations()
        .filter((decl) => {
          const variableStatement = decl.getVariableStatement();
          return variableStatement?.hasExportKeyword() ?? false;
        });

      for (const variable of exportedVariables) {
        const functionDef = this.parseConvexFunction(variable, moduleName);
        if (functionDef) {
          functions.push(functionDef);
        }
      }

      return functions;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Parse a variable declaration to check if it's a Convex function
   */
  private parseConvexFunction(
    variable: VariableDeclaration,
    moduleName: string
  ): FunctionDefinition | null {
    const name = variable.getName();
    const initializer = variable.getInitializer();

    if (!initializer) {
      return null;
    }

    // Check if the initializer is a call expression (query(), mutation(), action())
    if (initializer.getKind() !== SyntaxKind.CallExpression) {
      return null;
    }

    const callExpr = initializer as CallExpression;
    const expression = callExpr.getExpression();

    // Check if it's a call to query, mutation, or action
    const functionType = this.getFunctionType(expression.getText());
    if (!functionType) {
      return null;
    }

    // Extract arguments from the function configuration
    const args = this.extractArgs(callExpr);

    return {
      name,
      type: functionType,
      module: moduleName,
      args,
    };
  }

  /**
   * Determine the function type from the call expression
   */
  private getFunctionType(expressionText: string): FunctionType | null {
    switch (expressionText) {
      case "query":
        return "query";
      case "mutation":
        return "mutation";
      case "action":
        return "action";
      default:
        return null;
    }
  }

  /**
   * Extract arguments from the Convex function configuration object
   */
  private extractArgs(
    callExpr: CallExpression
  ): Record<string, ArgDefinition> | undefined {
    const args = callExpr.getArguments();
    if (args.length === 0) {
      return;
    }

    const configObject = args[0];
    if (configObject.getKind() !== SyntaxKind.ObjectLiteralExpression) {
      return;
    }

    const objLiteral = configObject as ObjectLiteralExpression;
    const argsProperty = objLiteral.getProperty("args");

    if (
      !argsProperty ||
      argsProperty.getKind() !== SyntaxKind.PropertyAssignment
    ) {
      return;
    }

    const argsAssignment = argsProperty as PropertyAssignment;
    const argsValue = argsAssignment.getInitializer();

    if (
      !argsValue ||
      argsValue.getKind() !== SyntaxKind.ObjectLiteralExpression
    ) {
      return;
    }

    return this.parseArgsObject(argsValue as ObjectLiteralExpression);
  }

  /**
   * Parse the args object to extract argument definitions
   */
  private parseArgsObject(
    argsObject: ObjectLiteralExpression
  ): Record<string, ArgDefinition> {
    const argDefinitions: Record<string, ArgDefinition> = {};

    const properties = argsObject.getProperties();
    for (const prop of properties) {
      if (prop.getKind() !== SyntaxKind.PropertyAssignment) {
        continue;
      }

      const assignment = prop as PropertyAssignment;
      const argName = assignment.getName();
      if (!argName) {
        continue;
      }

      const initializer = assignment.getInitializer();
      if (!initializer) {
        continue;
      }

      const argDef = this.parseValidatorCall(initializer.getText());
      if (argDef) {
        argDefinitions[argName] = argDef;
      }
    }

    return argDefinitions;
  }

  /**
   * Parse a validator call (e.g., v.string(), v.number(), v.optional(v.string()))
   */
  private parseValidatorCall(validatorText: string): ArgDefinition | null {
    // Handle v.optional() wrapper
    const optionalMatch = validatorText.match(OPTIONAL_VALIDATOR_REGEX);
    if (optionalMatch) {
      const innerValidator = this.parseValidatorCall(optionalMatch[1]);
      return innerValidator ? { ...innerValidator, required: false } : null;
    }

    // Map basic validator types
    const validatorTypeMap: Record<string, string> = {
      "v.string()": "string",
      "v.number()": "number",
      "v.float64()": "number",
      "v.int64()": "integer",
      "v.bigint()": "integer",
      "v.boolean()": "boolean",
    };

    // Check for basic types
    for (const [pattern, type] of Object.entries(validatorTypeMap)) {
      if (validatorText === pattern) {
        return { type, required: true };
      }
    }

    // Handle v.id() calls
    if (validatorText.startsWith("v.id(")) {
      return { type: "string", required: true };
    }

    // Handle v.literal() calls
    if (validatorText.startsWith("v.literal(")) {
      return { type: "string", required: true };
    }

    // Handle v.union() calls
    if (validatorText.startsWith("v.union(")) {
      return { type: "string", required: true }; // Simplified for now
    }

    // Handle v.object() calls
    if (validatorText.startsWith("v.object(")) {
      return { type: "object", required: true };
    }

    // Handle v.array() calls
    if (validatorText.startsWith("v.array(")) {
      return { type: "array", required: true };
    }

    // Default to string type for unknown validators
    return { type: "string", required: true };
  }
}
