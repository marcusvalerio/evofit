export const DAYS = ["Segunda","Terca","Quarta","Quinta","Sexta","Sabado","Domingo"] as const
export type Day = typeof DAYS[number]
export const MEALS_ORDER = ["Cafe","Almoco","Lanche","Jantar"] as const
export type MealName = typeof MEALS_ORDER[number]
export interface Item { name: string; qty: string; supl?: boolean }
export type Plan = Record<Day, Record<MealName, Item[]>>

export const PLAN: Plan = {
  Segunda: {
    Cafe:   [{name:"Ovos mexidos",qty:"3 un."},{name:"Pão integral",qty:"2 fatias"},{name:"Café preto",qty:"200ml"}],
    Almoco: [{name:"Frango grelhado",qty:"200g"},{name:"Arroz integral",qty:"4 col."},{name:"Feijão",qty:"2 conchas"},{name:"Salada de folhas",qty:"livre"}],
    Lanche: [{name:"Banana",qty:"1 un."},{name:"Iogurte zero",qty:"170g"},{name:"Creatina",qty:"5g",supl:true}],
    Jantar: [{name:"Frango assado",qty:"200g"},{name:"Batata-doce",qty:"150g"},{name:"Brócolis refogado",qty:"100g"}],
  },
  Terca: {
    Cafe:   [{name:"Omelete de frango",qty:"3 ovos + 80g"},{name:"Café preto",qty:"200ml"}],
    Almoco: [{name:"Frango desfiado",qty:"200g"},{name:"Arroz integral",qty:"4 col."},{name:"Feijão",qty:"2 conchas"},{name:"Couve refogada",qty:"100g"}],
    Lanche: [{name:"Iogurte zero",qty:"170g"},{name:"Amendoim",qty:"30g"},{name:"Creatina",qty:"5g",supl:true}],
    Jantar: [{name:"Frango grelhado",qty:"180g"},{name:"Macarrão integral",qty:"80g seco"},{name:"Molho de tomate",qty:"3 col."}],
  },
  Quarta: {
    Cafe:   [{name:"Tapioca com ovo",qty:"2 un. + 2 ovos"},{name:"Café com leite",qty:"200ml"}],
    Almoco: [{name:"Frango grelhado",qty:"200g"},{name:"Arroz integral",qty:"4 col."},{name:"Feijão",qty:"2 conchas"},{name:"Cenoura e beterraba",qty:"100g"}],
    Lanche: [{name:"Iogurte zero",qty:"170g"},{name:"Banana",qty:"1 un."},{name:"Creatina",qty:"5g",supl:true}],
    Jantar: [{name:"Omelete de legumes",qty:"3 ovos"},{name:"Espinafre refogado",qty:"100g"},{name:"Pão integral",qty:"1 fatia"}],
  },
  Quinta: {
    Cafe:   [{name:"Mingau de aveia",qty:"200ml"},{name:"Ovos cozidos",qty:"2 un."},{name:"Café preto",qty:"200ml"}],
    Almoco: [{name:"Frango assado com alho",qty:"200g"},{name:"Purê de batata-doce",qty:"150g"},{name:"Vagem refogada",qty:"100g"},{name:"Salada de tomate",qty:"livre"}],
    Lanche: [{name:"Iogurte zero",qty:"170g"},{name:"Mel",qty:"1 col. chá"},{name:"Creatina",qty:"5g",supl:true}],
    Jantar: [{name:"Frango grelhado",qty:"200g"},{name:"Arroz integral",qty:"3 col."},{name:"Abobrinha grelhada",qty:"120g"}],
  },
  Sexta: {
    Cafe:   [{name:"Panqueca de aveia",qty:"3 un."},{name:"Mel",qty:"1 col. chá"},{name:"Café preto",qty:"200ml"}],
    Almoco: [{name:"Frango grelhado",qty:"200g"},{name:"Arroz integral",qty:"4 col."},{name:"Feijão",qty:"2 conchas"},{name:"Alface e rúcula",qty:"livre"}],
    Lanche: [{name:"Iogurte com granola",qty:"170g + 20g"},{name:"Creatina",qty:"5g",supl:true}],
    Jantar: [{name:"Frango assado com ervas",qty:"200g"},{name:"Batata-doce assada",qty:"150g"},{name:"Chuchu refogado",qty:"100g"}],
  },
  Sabado: {
    Cafe:   [{name:"Ovos estrelados",qty:"3 un."},{name:"Tapioca",qty:"1 un."},{name:"Suco de laranja",qty:"200ml"}],
    Almoco: [{name:"Frango grelhado",qty:"250g"},{name:"Arroz integral",qty:"4 col."},{name:"Vinagrete",qty:"100g"},{name:"Feijão",qty:"2 conchas"}],
    Lanche: [{name:"Iogurte zero",qty:"170g"},{name:"Amendoim",qty:"30g"},{name:"Creatina",qty:"5g",supl:true}],
    Jantar: [{name:"Salada com frango",qty:"1 bowl"},{name:"Azeite e limão",qty:"a gosto"},{name:"Pão integral",qty:"2 fatias"}],
  },
  Domingo: {
    Cafe:   [{name:"Vitamina de banana c/ aveia",qty:"300ml"},{name:"Torrada integral",qty:"2 un."},{name:"Requeijão light",qty:"1 col."}],
    Almoco: [{name:"Frango ao molho",qty:"200g"},{name:"Arroz integral",qty:"4 col."},{name:"Feijão",qty:"2 conchas"},{name:"Farofa light",qty:"2 col."}],
    Lanche: [{name:"Iogurte com frutas",qty:"170g + 80g"},{name:"Creatina",qty:"5g",supl:true}],
    Jantar: [{name:"Omelete de frango e queijo",qty:"3 ovos + 80g"},{name:"Legumes assados",qty:"150g"},{name:"Arroz integral",qty:"3 col."}],
  },
}
