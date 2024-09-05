'use client'

import { Github, Linkedin, Mail, FileText, ChevronDown } from "lucide-react"

export function Portfolio() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-red-500">JD</h1>
          <nav>
            <ul className="flex space-x-4">
              <li><a href="#about" className="hover:text-red-500 transition-colors">About</a></li>
              <li><a href="#projects" className="hover:text-red-500 transition-colors">Projects</a></li>
              <li><a href="#contact" className="hover:text-red-500 transition-colors">Contact</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section id="hero" className="bg-gray-900 text-white py-20">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-5xl font-bold mb-4">Jane Doe</h2>
            <p className="text-xl mb-8">Full-Stack Developer & UI/UX Enthusiast</p>
            <a href="#contact" className="bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-colors">Get in touch</a>
          </div>
        </section>

        <section id="about" className="py-20">
          <div className="container mx-auto px-6">
            <h3 className="text-3xl font-bold mb-8 text-center">About Me</h3>
            <div className="max-w-2xl mx-auto text-center">
              <p className="mb-4">I'm a passionate developer with a keen eye for design. I love creating beautiful, functional websites and applications that solve real-world problems.</p>
              <p>With 5 years of experience in both front-end and back-end development, I bring a holistic approach to every project I work on.</p>
            </div>
          </div>
        </section>

        <section id="projects" className="bg-white py-20">
          <div className="container mx-auto px-6">
            <h3 className="text-3xl font-bold mb-8 text-center">My Projects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((project) => (
                <div key={project} className="bg-gray-100 p-6 rounded-lg shadow-md">
                  <div className="w-full h-40 bg-gray-300 rounded-md mb-4"></div>
                  <h4 className="text-xl font-semibold mb-2">Project {project}</h4>
                  <p className="text-gray-600 mb-4">A brief description of the project and the technologies used.</p>
                  <a href="#" className="text-red-500 hover:underline">View Project</a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="py-20">
          <div className="container mx-auto px-6 text-center">
            <h3 className="text-3xl font-bold mb-8">Get In Touch</h3>
            <div className="flex justify-center space-x-4 mb-8">
              <a href="#" className="text-gray-600 hover:text-red-500 transition-colors"><Github size={24} /></a>
              <a href="#" className="text-gray-600 hover:text-red-500 transition-colors"><Linkedin size={24} /></a>
              <a href="#" className="text-gray-600 hover:text-red-500 transition-colors"><Mail size={24} /></a>
            </div>
            <a href="#" className="inline-block bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600 transition-colors">
              Download CV
              <FileText className="inline-block ml-2" size={18} />
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-6">
        <div className="container mx-auto px-6 text-center">
          <p>&copy; 2023 Jane Doe. All rights reserved.</p>
        </div>
      </footer>

      <a href="#hero" className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors">
        <ChevronDown size={24} />
      </a>
    </div>
  )
}