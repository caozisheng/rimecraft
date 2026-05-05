export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
	return <a href={href} {...props}>{children}</a>;
}
