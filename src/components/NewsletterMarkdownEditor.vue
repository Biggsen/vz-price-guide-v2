<script setup>
import { nextTick, ref } from 'vue'
import { wrapLink, wrapSelection } from '../utils/newsletterMarkdown.js'

const props = defineProps({
	modelValue: {
		type: String,
		default: ''
	},
	disabled: {
		type: Boolean,
		default: false
	}
})

const emit = defineEmits(['update:modelValue'])
const textareaRef = ref(null)

function currentRange() {
	const el = textareaRef.value
	if (!el) {
		const end = props.modelValue.length
		return { start: end, end }
	}
	return { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
}

function applyWrap(before, after) {
	if (props.disabled) return
	const { start, end } = currentRange()
	const next = wrapSelection(props.modelValue, start, end, before, after)
	emit('update:modelValue', next.value)
	nextTick(() => {
		const el = textareaRef.value
		if (!el) return
		el.focus()
		el.setSelectionRange(next.cursorStart, next.cursorEnd)
	})
}

function applyLink() {
	if (props.disabled) return
	const url = window.prompt('Link URL (https://…)')
	if (!url || !/^https?:\/\//i.test(url.trim())) return
	const { start, end } = currentRange()
	const next = wrapLink(props.modelValue, start, end, url.trim())
	emit('update:modelValue', next.value)
	nextTick(() => {
		const el = textareaRef.value
		if (!el) return
		el.focus()
		el.setSelectionRange(next.cursorStart, next.cursorEnd)
	})
}
</script>

<template>
	<div>
		<div class="flex flex-wrap gap-2 mb-2">
			<button
				type="button"
				class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50"
				:disabled="disabled"
				data-cy="newsletter-format-bold"
				@click="applyWrap('**')">
				Bold
			</button>
			<button
				type="button"
				class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 italic disabled:opacity-50"
				:disabled="disabled"
				data-cy="newsletter-format-italic"
				@click="applyWrap('*')">
				Italic
			</button>
			<button
				type="button"
				class="px-2 py-1 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50"
				:disabled="disabled"
				data-cy="newsletter-format-link"
				@click="applyLink">
				Link
			</button>
		</div>
		<textarea
			ref="textareaRef"
			:value="modelValue"
			:disabled="disabled"
			rows="14"
			data-cy="newsletter-body"
			class="block w-full rounded border-2 border-gray-asparagus px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans disabled:bg-gray-50"
			placeholder="Write the email body. Use Bold, Italic, or Link, or type **bold**, *italic*, and [text](https://example.com)."
			@input="emit('update:modelValue', $event.target.value)"></textarea>
	</div>
</template>
