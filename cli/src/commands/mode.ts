/**
 * /mode command - Switch between different modes
 */

import type { Command, ArgumentValue, CommandContext } from "./core/types.js"
import { DEFAULT_MODES, getAllModes } from "../constants/modes/defaults.js"

export const modeCommand: Command = {
	name: "mode",
	aliases: ["m"],
	description: "Switch to a different mode",
	usage: "/mode <mode-name>",
	examples: ["/mode code", "/mode architect", "/mode debug"],
	category: "settings",
	priority: 9,
	arguments: [
		{
			name: "mode-name",
			description: "The mode to switch to",
			required: true,
			placeholder: "Select a mode",
			values: (context: CommandContext) => {
				const allModes = getAllModes(context.customModes)
				return allModes.map((mode) => ({
					name: mode.slug,
					description: mode.description || `Switch to ${mode.name} mode`,
				}))
			},
			validate: (value: ArgumentValue, context: CommandContext) => {
				if (typeof value !== "string") {
					return {
						isValid: false,
						message: "Mode name must be a string.",
					}
				}
				const allModes = getAllModes(context.customModes)
				const availableSlugs = allModes.map((mode) => mode.slug)
				if (!availableSlugs.includes(value)) {
					return {
						isValid: false,
						message: `Invalid mode "${value}". Available modes: ${availableSlugs.join(", ")}`,
					}
				}
				return { isValid: true }
			},
		},
	],
	handler: async (context) => {
		const { args, addMessage, setMode, customModes } = context

		// Get all available modes (default + custom)
		const allModes = getAllModes(customModes)

		if (args.length === 0 || !args[0]) {
			// Show current mode and available modes
			const modesList = allModes.map((mode) => {
				const source = mode.source === "project" ? " (project)" : mode.source === "global" ? " (global)" : ""
				return `  - **${mode.name}** (${mode.slug})${source}: ${mode.description || "No description"}`
			})

			addMessage({
				id: Date.now().toString(),
				type: "system",
				content: ["**Available Modes:**", "", ...modesList, "", "Usage: /mode <mode-name>"].join("\n"),
				ts: Date.now(),
			})
			return
		}

		const requestedMode = args[0].toLowerCase()

		// Find the mode to get its display name
		const mode = allModes.find((m) => m.slug === requestedMode)
		const modeName = mode?.name || requestedMode

		setMode(requestedMode)

		addMessage({
			id: Date.now().toString(),
			type: "system",
			content: `Switched to **${modeName}** mode.`,
			ts: Date.now(),
		})
	},
}
