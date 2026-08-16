import { Link } from "react-router-dom";
import { projects } from "../data/projects";
import "./Hub.css";

export function Hub() {
  return (
    <main className="hub">
      <h1>My Projects</h1>
      <p className="hub__intro">A single place to reach everything I've built.</p>
      <div className="hub__grid">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <h2>{project.name}</h2>
            <p className="project-card__tagline">{project.tagline}</p>
            <p className="project-card__description">{project.description}</p>
            <ul className="project-card__tags">
              {project.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            {project.internalPath ? (
              <Link className="project-card__link" to={project.internalPath}>
                {project.linkLabel} →
              </Link>
            ) : (
              <a
                className="project-card__link"
                href={project.externalHref}
                target="_blank"
                rel="noreferrer"
              >
                {project.linkLabel} →
              </a>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
