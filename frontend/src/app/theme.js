import {createSystem, defaultConfig, defineConfig, defineGlobalStyles} from '@chakra-ui/react'

const config = defineConfig({
    theme: {
        tokens: {
            colors: {
                lamp: {
                    50: '#fff9eb',
                    100: '#ffeec7',
                    200: '#ffdb8a',
                    300: '#ffc24d',
                    400: '#ffa824',
                    500: '#f98a0d',
                    600: '#dd6607',
                    700: '#b7470a',
                    800: '#93380f',
                    900: '#782f10',
                    950: '#451605',
                },
            },
            fonts: {
                heading: {value: `'Comfortaa', cursive`},
                body: {value: `'Comfortaa', 'Segoe UI', system-ui, sans-serif`},
            },
        },
        semanticTokens: {
            colors: {
                bg: {value: '#f7f4ee'},
                surface: {value: '#ffffff'},
                edge: {value: '#e8e1d6'},
            },
        },
    },
    globalCss: defineGlobalStyles({
        body: {
            bg: 'bg',
            color: 'fg',
        },
    }),
})

const system = createSystem(defaultConfig, config)

export default system