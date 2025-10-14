declare module 'vue3-roulette' {
  import { DefineComponent } from 'vue';

  const Vue3Roulette: DefineComponent<
    {
      items: Array<{ id: string; label: string }>;
      duration: number;
      stopIndex: number;
    },
    object,
    unknown
  >;

  export default Vue3Roulette;
}