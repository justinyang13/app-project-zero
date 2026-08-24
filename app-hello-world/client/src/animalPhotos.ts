// Real animal photos sourced from Wikimedia Commons (all CC-licensed or public
// domain), picked at random per species on every page load. See ANIMAL_PHOTOS
// below for the full attribution (artist, license, source link) per photo.

import type { AnimalSpecies } from "./components/AstronautAnimal";

export interface AnimalPhoto {
  url: string;
  title: string;
  descUrl: string;
  license: string;
  align: string; // SVG preserveAspectRatio x/y alignment, e.g. "xMidYMin"
}

export const ANIMAL_PHOTOS: Record<AnimalSpecies, AnimalPhoto[]> = {
  cat: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cat_November_2010-1a.jpg/500px-Cat_November_2010-1a.jpg",
      title: "Cat November 2010-1a.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cat_November_2010-1a.jpg",
      license: "CC BY-SA 3.0",
      align: "xMidYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Cute_cat_%281698598876%29.jpg/500px-Cute_cat_%281698598876%29.jpg",
      title: "Cute cat (1698598876).jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cute_cat_(1698598876).jpg",
      license: "CC BY-SA 2.0",
      align: "xMidYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Cute_cat_2024.jpg/500px-Cute_cat_2024.jpg",
      title: "Cute cat 2024.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cute_cat_2024.jpg",
      license: "CC0",
      align: "xMaxYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Cute_cat_photo.jpg/500px-Cute_cat_photo.jpg",
      title: "Cute cat photo.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cute_cat_photo.jpg",
      license: "CC BY-SA 4.0",
      align: "xMidYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Felis_catus-cat_on_snow.jpg/500px-Felis_catus-cat_on_snow.jpg",
      title: "Felis catus-cat on snow.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Felis_catus-cat_on_snow.jpg",
      license: "CC BY-SA 3.0",
      align: "xMinYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Cute_grey_kitten.jpg/500px-Cute_grey_kitten.jpg",
      title: "Cute grey kitten.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cute_grey_kitten.jpg",
      license: "CC BY-SA 2.0",
      align: "xMidYMid",
    },
  ],
  dog: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Black_Puppy.jpg/500px-Black_Puppy.jpg",
      title: "Black Puppy.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Black_Puppy.jpg",
      license: "CC BY-SA 4.0",
      align: "xMidYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Cute_dog_on_table.jpg/500px-Cute_dog_on_table.jpg",
      title: "Cute dog on table.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cute_dog_on_table.jpg",
      license: "CC BY 2.0",
      align: "xMinYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Golden_Retriever_Puppy.JPG/500px-Golden_Retriever_Puppy.JPG",
      title: "Golden Retriever Puppy.JPG",
      descUrl: "https://commons.wikimedia.org/wiki/File:Golden_Retriever_Puppy.JPG",
      license: "CC BY-SA 4.0",
      align: "xMidYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Golden_Retriever_Puppy_2012_01.jpg/500px-Golden_Retriever_Puppy_2012_01.jpg",
      title: "Golden Retriever Puppy 2012 01.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Golden_Retriever_Puppy_2012_01.jpg",
      license: "CC BY-SA 4.0",
      align: "xMidYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Callie_the_golden_retriever_puppy.jpg/500px-Callie_the_golden_retriever_puppy.jpg",
      title: "Callie the golden retriever puppy.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Callie_the_golden_retriever_puppy.jpg",
      license: "CC BY 3.0",
      align: "xMidYMid",
    },
  ],
  bunny: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/A_cute_rabbit_in_black_and_white_combination.jpg/500px-A_cute_rabbit_in_black_and_white_combination.jpg",
      title: "A cute rabbit in black and white combination.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:A_cute_rabbit_in_black_and_white_combination.jpg",
      license: "CC BY-SA 4.0",
      align: "xMidYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/My_cute_rabbit.JPG/500px-My_cute_rabbit.JPG",
      title: "My cute rabbit.JPG",
      descUrl: "https://commons.wikimedia.org/wiki/File:My_cute_rabbit.JPG",
      license: "CC BY-SA 3.0",
      align: "xMidYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Two_bonded_rabbit_pair_sitting_together.jpg/500px-Two_bonded_rabbit_pair_sitting_together.jpg",
      title: "Two bonded rabbit pair sitting together.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Two_bonded_rabbit_pair_sitting_together.jpg",
      license: "CC BY-SA 4.0",
      align: "xMidYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/More_than_just_a_cute_bunny.jpg/500px-More_than_just_a_cute_bunny.jpg",
      title: "More than just a cute bunny.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:More_than_just_a_cute_bunny.jpg",
      license: "CC BY-SA 4.0",
      align: "xMidYMid",
    },
  ],
  panda: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Chengdu-pandas-d12.jpg/500px-Chengdu-pandas-d12.jpg",
      title: "Chengdu-pandas-d12.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Chengdu-pandas-d12.jpg",
      license: "CC BY-SA 2.5 es",
      align: "xMidYMax",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Giant_Panda_%28Ailuropoda_melanoleuca%29_%22Tian_Tian%22.jpg/500px-Giant_Panda_%28Ailuropoda_melanoleuca%29_%22Tian_Tian%22.jpg",
      title: "Giant Panda (Ailuropoda melanoleuca) \"Tian Tian\".jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Giant_Panda_(Ailuropoda_melanoleuca)_%22Tian_Tian%22.jpg",
      license: "CC BY 2.0",
      align: "xMidYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Giant_Panda_Washington_DC.JPG/500px-Giant_Panda_Washington_DC.JPG",
      title: "Giant Panda Washington DC.JPG",
      descUrl: "https://commons.wikimedia.org/wiki/File:Giant_Panda_Washington_DC.JPG",
      license: "CC BY-SA 3.0",
      align: "xMidYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Panda_Cub_from_Wolong%2C_Sichuan%2C_China.JPG/500px-Panda_Cub_from_Wolong%2C_Sichuan%2C_China.JPG",
      title: "Panda Cub from Wolong, Sichuan, China.JPG",
      descUrl: "https://commons.wikimedia.org/wiki/File:Panda_Cub_from_Wolong,_Sichuan,_China.JPG",
      license: "Public domain",
      align: "xMidYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Resting_Panda_-_Panda_Research_Centre%2C_Chengdu_%281483005621%29.jpg/500px-Resting_Panda_-_Panda_Research_Centre%2C_Chengdu_%281483005621%29.jpg",
      title: "Resting Panda - Panda Research Centre, Chengdu (1483005621).jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Resting_Panda_-_Panda_Research_Centre,_Chengdu_(1483005621).jpg",
      license: "CC BY-SA 2.0",
      align: "xMinYMid",
    },
  ],
  fox: [
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Cute_Arctic_Fox_%2852734632943%29.jpg/500px-Cute_Arctic_Fox_%2852734632943%29.jpg",
      title: "Cute Arctic Fox (52734632943).jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cute_Arctic_Fox_(52734632943).jpg",
      license: "CC BY-SA 2.0",
      align: "xMidYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Portrait_of_a_Red_Fox_%2849015169973%29.jpg/500px-Portrait_of_a_Red_Fox_%2849015169973%29.jpg",
      title: "Portrait of a Red Fox (49015169973).jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Portrait_of_a_Red_Fox_(49015169973).jpg",
      license: "CC BY 2.0",
      align: "xMidYMin",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Cute_fox_sleeping.jpg/500px-Cute_fox_sleeping.jpg",
      title: "Cute fox sleeping.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Cute_fox_sleeping.jpg",
      license: "CC0",
      align: "xMaxYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Fox_cub_cute_fox_animal.jpg/500px-Fox_cub_cute_fox_animal.jpg",
      title: "Fox cub cute fox animal.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Fox_cub_cute_fox_animal.jpg",
      license: "Public domain",
      align: "xMinYMid",
    },
    {
      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Two_cute_arctic_fox_pups.jpg/500px-Two_cute_arctic_fox_pups.jpg",
      title: "Two cute arctic fox pups.jpg",
      descUrl: "https://commons.wikimedia.org/wiki/File:Two_cute_arctic_fox_pups.jpg",
      license: "Public domain",
      align: "xMidYMid",
    },
  ],
};
