import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {} // eslint-disable-line @typescript-eslint/no-empty-object-type
  }
}
