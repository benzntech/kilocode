/**
 * Custom modes loader
 * Loads custom modes from global and project-specific configuration files
 */

import { readFile } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { parse } from "yaml"
import type { ModeConfig } from "../types/messages.js"
import { logs } from "../services/logs.js"

/**
 * Get the global custom modes file path
 * @returns Path to global custom_modes.yaml
 */
function getGlobalModesPath(): string {
	return join(homedir(), ".config", "kilocode", "modes.yaml")
}

/**
 * Get the project custom modes file path
 * @param workspace - Workspace directory path
 * @returns Path to .kilocodemodes
 */
function getProjectModesPath(workspace: string): string {
	return join(workspace, ".kilocodemodes")
}

/**
 * Parse custom modes from YAML content
 * @param content - YAML file content
 * @param source - Source of the modes ('global' or 'project')
 * @returns Array of mode configurations
 */
function parseCustomModes(content: string, source: "global" | "project"): ModeConfig[] {
	try {
		const parsed = parse(content)

		if (!parsed || typeof parsed !== "object") {
			return []
		}

		// Handle both YAML format (customModes array) and JSON format
		const modes = parsed.customModes || []

		if (!Array.isArray(modes)) {
			return []
		}

		// Validate and normalize mode configs
		return modes
			.filter((mode: Record<string, any>) => {
				// Must have at least slug and name
				return mode && typeof mode === "object" && mode.slug && mode.name
			})
			.map((mode: Record<string, any>) => ({
				slug: mode.slug,
				name: mode.name,
				description: mode.description,
				systemPrompt: mode.roleDefinition || mode.systemPrompt,
				rules: mode.customInstructions ? [mode.customInstructions] : mode.rules || [],
				source: mode.source || source,
			}))
	} catch (error) {
		logs.warn(`Failed to parse ${source} custom modes file.`, "custom-modes", { error })
		return []
	}
}

/**
 * Load custom modes from global configuration
 * @returns Array of global custom modes
 */
async function loadGlobalCustomModes(): Promise<ModeConfig[]> {
	const globalPath = getGlobalModesPath()

	if (!existsSync(globalPath)) {
		return []
	}

	try {
		const content = await readFile(globalPath, "utf-8")
		return parseCustomModes(content, "global")
	} catch (error) {
		logs.warn("Failed to read or parse global custom modes file.", "custom-modes", { path: globalPath, error })
		return []
	}
}

/**
 * Load custom modes from project configuration
 * @param workspace - Workspace directory path
 * @returns Array of project custom modes
 */
async function loadProjectCustomModes(workspace: string): Promise<ModeConfig[]> {
	const projectPath = getProjectModesPath(workspace)

	if (!existsSync(projectPath)) {
		return []
	}

	try {
		const content = await readFile(projectPath, "utf-8")
		return parseCustomModes(content, "project")
	} catch (error) {
		logs.warn("Failed to read or parse project custom modes file.", "custom-modes", { path: projectPath, error })
		return []
	}
}

/**
 * Load all custom modes (global + project)
 * Project modes override global modes with the same slug
 * @param workspace - Workspace directory path
 * @returns Array of all custom mode configurations
 */
export async function loadCustomModes(workspace: string): Promise<ModeConfig[]> {
	const [globalModes, projectModes] = await Promise.all([loadGlobalCustomModes(), loadProjectCustomModes(workspace)])

	// Merge modes, with project modes taking precedence over global modes
	const modesMap = new Map<string, ModeConfig>()

	// Add global modes first
	for (const mode of globalModes) {
		modesMap.set(mode.slug, mode)
	}

	// Override with project modes
	for (const mode of projectModes) {
		modesMap.set(mode.slug, mode)
	}

	return Array.from(modesMap.values())
}
