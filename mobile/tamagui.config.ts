import { config } from '@tamagui/config/v3'
import { createTamagui } from 'tamagui'

// Re-export the default Tamagui config. This keeps things simple while
// providing a polished set of components and themes.
export default createTamagui(config)
