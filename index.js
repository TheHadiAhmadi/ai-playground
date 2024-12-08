import fs, { mkdirSync, writeFileSync } from 'fs'
import { OpenAI } from "openai";
import "dotenv/config";

process.env.OPENAI_BASE_URL = "https://kolank.com/api/v1"
const apiKey = "..."

const api = new OpenAI({
  apiKey,
});

async function ai(system, prompt) {
  try {

    console.log('waiting for ai response...')
    // console.log(api.apiKey, api.baseURL)
    const completion = await api.chat.completions.create({
      model: 'Openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      // temperature: 0.9,
      // response_format: 
    });  

    // console.log(completion)

    return completion.choices[0].message.content;

  } catch(err) {
    console.log(err)

    return null
  }
}

const main = async () => {
  // ai('')

  const site = await generateSite("Website for portfolio of NightOwls team");

  writeSite(site, './result')
};

function writePage(page, path, site) {
  if(page.path === '/') page.path = '/index.html'; else page.path = page.path + '.html'

  fs.writeFileSync(path + page.path, `
  <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = ${JSON.stringify(site.prompts.tailwindConfig)}
    </script>
    <title>${page.title}</title>
</head>
<body>
    ${page.sections.map(x => `<section id="${x.name}" class="bg-white dark:bg-gray-900 dark:text-white">
      ${x.html}
    </section>`).join('\n')}
</body>
</html>
`)
}

function writeSite(site, path) {
  if(fs.existsSync(path)) {
    fs.rmSync(path, {recursive: true})
  }
  mkdirSync(path)

  writeFileSync(path + '/prompts.json', JSON.stringify(site.prompts, null, 2))
  for(let page of site.pages) {
    writePage(page, path, site)
  }
}


async function generateSite(prompt) {
  const requirementsResponse = await ai('You are tasked to generate requirements of the site. you should generate array of strings for requirements as json.', prompt)
  const prompts = {}

  prompts.prompt = prompt

  // console.log(requirementsResponse)
  const requirements = JSON.parse(requirementsResponse.slice('```json'.length, requirementsResponse.length - 3))


  prompts.requirements = requirements

  const pagesResponse = await ai('based on the requirements and user prompt, generate list of the required pages to accomplish the site. don\'t include unused pages. only required pages. at least 5 page and at most 9 pages. Here is the requirements: ' + JSON.stringify(requirements) + '\n\nOutput format: it should return only array of pages, page object has these fields: title, path, description (features and usefulness of this page), don\'t write anyting other than json block \n', prompt)
  // console.log(pagesResponse)
  
  const pages = JSON.parse(pagesResponse.slice('```json'.length, pagesResponse.length - 3))
  prompts.pages = pages


  // const pages = [
    // {
    //   "title": "Homepage",
    //   "path": "/",
    //   "description": "Overview of NightOwls team and mission, highlighting the team's vision and values."
    // },
  //   {
  //     "title": "Portfolio",
  //     "path": "/portfolio",
  //     "description": "Showcase of individual and team projects, featuring images, descriptions, and links to live projects."
  //   },
  //   {
  //     "title": "Team",
  //     "path": "/team",
  //     "description": "Profiles of team members with bios, skills, and roles, allowing visitors to get to know the NightOwls."
  //   },
  //   {
  //     "title": "Contact",
  //     "path": "/contact",
  //     "description": "Contact form for potential clients to reach out to the team for inquiries and project discussions."
  //   },
  //   {
  //     "title": "Blog",
  //     "path": "/blog",
  //     "description": "Updates and insights from the team, providing valuable content and engaging with the audience."
  //   },
  //   {
  //     "title": "Testimonials",
  //     "path": "/testimonials",
  //     "description": "Highlighting client feedback and project success stories, building trust and credibility."
  //   },
  //   {
  //     "title": "Search",
  //     "path": "/search",
  //     "description": "Functionality to easily navigate the portfolio, helping users find specific projects or information."
  //   },
  //   {
  //     "title": "Social Media",
  //     "path": "/social-media",
  //     "description": "Links to connect with NightOwls on various social media platforms, fostering community engagement."
  //   }
  // ]
  
  for(let page of pages) {
    // const systemPrompt = 'Consider the requirements, current page and user prompt, Here is the requirements: ' + JSON.stringify(requirements) + `\n\nPage: ${JSON.stringify(page)}\n\nUser Prompt: ${prompt}\nOutput format: \nShould return array of sections (each section has these fields: {name: string, content: string})`

    // console.log(systemPrompt)

    const sectionsResponse = await ai(`Based on the provided requirements, page details, and user prompt, generate the sections of the page. define structure of the section as prompt string.

    Requirements: ${JSON.stringify(requirements)}
    
    Page Details: ${JSON.stringify(page)}
    
    User Prompt: ${prompt}

    Considerations:
    for images use picsum or other services.
    
    Output format: 
    Return a JSON array of objects which has name:string and features:string(containing definition of the ui and elements) fields. Do not include any text other than the JSON block.`,
      "Generate the body content of the page with Tailwind CSS design, ensuring consistency with the base design system."
    );

    // based on the requirements and user prompt, generate list of sections of the page, only generate contents of <section tag. don\'t include section tag.  style sections with tailwindcss and ensure they align with base design system. Here is the requirements: ' + JSON.stringify(requirements) + `\n\nPage: ${JSON.stringify(page)}\n\nUser Prompt: ${prompt}\nOutput format: \nShould return array of sections. (each section has these fields: {name: string, html: string}), dont write any text other than json block`, "Generate section of current page with tailwindcss design, consider a base design system and follow the design")

    const sections = JSON.parse(sectionsResponse.slice('```json'.length, sectionsResponse.length - 3))

    page.sections = sections
  }


  const themeResponse = await ai('you are expert in frontend and design system. you should generate design system for tailwind. output format should be a detiled string with all available spacing, sizing and colors, response will be used as context in other prompts. all prompt results should be same and based on the current theme.', "Generate modern bluish light theme")
  console.log(themeResponse)

  prompts.theme = themeResponse

  const tailwindConfigResponse = await ai(`Generate tailwind config as json object. only include json block without unused text. \n\nTheme: ${themeResponse}`, "Generate tailwind config based on theme.")
  console.log(tailwindConfigResponse)

  // TODO: JSON ..
  prompts.tailwindConfig = tailwindConfigResponse

  
  for(let page of pages)
  {
    for(let section of page.sections) {
      const htmlResponse = await ai(`Generate html for the "${section.name}" section.
Requirements: ${JSON.stringify(requirements)}

page: ${JSON.stringify(page)}

section: ${JSON.stringify(section)}

theme: ${themeResponse}

output format: You should return only html block with the contents of <section> tag. don't include section tag.
`, 'you should generate html of the section based on section details and current theme.')

    section.html = htmlResponse.slice('```html'.length, htmlResponse.length - 3)
    }
  }

  return {
    prompts,
    pages
  }
}

main();
