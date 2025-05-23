import { 
	createContext, 
	useContext, 
	useState, 
	useMemo, 
	PropsWithChildren 
} from 'react';

type DrawerCtx = {
	open: boolean
	width: number;
	toggle: () => void;
};

const defaultCtx: DrawerCtx = { open: true, width: 250, toggle: () => {} };
const Ctx = createContext<DrawerCtx>(defaultCtx);

export const DrawerProvider = ({ children }: PropsWithChildren) => {
	const [open, setOpen] = useState(true);
	const width = open ? 250 : 56;

	const value = useMemo<DrawerCtx>(
		() => ({ open, width, toggle: () => setOpen((o) => !o) }),
		[open],
	);
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useDrawer = () => useContext(Ctx);
